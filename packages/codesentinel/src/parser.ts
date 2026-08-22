/**
 * TypeScript/JavaScript parser using ts-morph.
 *
 * Per INSTRUCTION.md §13: use ts-morph / TypeScript Compiler API.
 * Do NOT write a custom parser.
 *
 * For Phase 2, this module:
 * - Creates a ts-morph Project
 * - Adds discovered source files
 * - Collects syntax-level diagnostics
 * - Returns parsed SourceFile ASTs for later analysis
 *
 * Type-level analysis (type checker) will be used in Phase 3+
 * when actual detection rules are implemented.
 */

import { Project, type SourceFile, ts } from 'ts-morph';
import type { WalkedFile } from './walker.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of parsing a set of source files. */
export interface ParseResult {
  /** The ts-morph Project instance (retains type checker for later use). */
  project: Project;

  /** Successfully parsed source files. */
  sourceFiles: SourceFile[];

  /** Errors encountered during parsing. */
  errors: ParseError[];
}

/** A parse error for a specific file. */
export interface ParseError {
  /** Relative path to the file. */
  file: string;

  /** Error description. */
  message: string;

  /** Line number (1-based), if available. */
  line?: number;

  /** Column number (1-based), if available. */
  column?: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a set of TypeScript/JavaScript files into ASTs.
 *
 * Creates a ts-morph Project with sensible defaults and adds all
 * provided files. Collects syntax errors but does not fail on them
 * (malformed files produce warnings, not crashes).
 *
 * @param files - Files discovered by the walker.
 * @returns Parse result with ASTs and any errors.
 */
export function parseFiles(files: WalkedFile[]): ParseResult {
  const project = new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      strict: true,
      noEmit: true,
      allowJs: true,
      checkJs: false,
      skipLibCheck: true,
      esModuleInterop: true,
    },
    // Don't load the target project's tsconfig — we use our own defaults.
    // The target project's tsconfig will be considered in future phases
    // for more accurate type information.
    skipAddingFilesFromTsConfig: true,
    // Skip resolving dependencies — we only analyze the project's own files.
    skipFileDependencyResolution: true,
  });

  const sourceFiles: SourceFile[] = [];
  const errors: ParseError[] = [];

  for (const file of files) {
    try {
      const sourceFile = project.addSourceFileAtPath(file.absolutePath);

      // Collect syntax diagnostics only (not semantic/type errors).
      // Semantic analysis happens in the detection rules (Phase 3+).
      const syntaxDiags = sourceFile.getPreEmitDiagnostics().filter(
        (d) => d.getCategory() === ts.DiagnosticCategory.Error,
      );

      for (const diag of syntaxDiags) {
        const messageText = diag.getMessageText();
        const message =
          typeof messageText === 'string'
            ? messageText
            : ts.flattenDiagnosticMessageText(messageText.compilerObject, '\n');

        const start = diag.getStart();
        const diagSourceFile = diag.getSourceFile();
        let line: number | undefined;
        let column: number | undefined;

        if (start !== undefined && diagSourceFile) {
          const pos = diagSourceFile.getLineAndColumnAtPos(start);
          line = pos.line;
          column = pos.column;
        }

        errors.push({ file: file.relativePath, message, line, column });
      }

      sourceFiles.push(sourceFile);
    } catch (e) {
      // File couldn't be added at all (rare — usually I/O errors)
      errors.push({
        file: file.relativePath,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { project, sourceFiles, errors };
}
