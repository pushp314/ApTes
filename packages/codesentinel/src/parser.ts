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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, type SourceFile, ts } from 'ts-morph';
import type { WalkedFile } from './walker.js';
import { PythonParser, type PythonParseResult } from './parser/python.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of parsing a set of source files. */
export interface ParseResult {
  /** The ts-morph Project instance (retains type checker for later use). */
  project: Project;

  /** Successfully parsed source files. */
  sourceFiles: SourceFile[];
  
  /** Successfully parsed Python files via tree-sitter. */
  pythonFiles: PythonParseResult[];

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
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Locate a tsconfig.json for the scanned project so that path aliases
 * (e.g. `@repo/ui` in monorepos) resolve correctly. Returns undefined when
 * no tsconfig.json exists at the project root.
 */
function findTsConfig(targetDir: string): string | undefined {
  const candidate = path.join(targetDir, 'tsconfig.json');
  try {
    fs.accessSync(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a set of files into ASTs.
 * Routes TypeScript/JavaScript to ts-morph, and Python to tree-sitter.
 *
 * @param files - Files discovered by the walker.
 * @param targetDir - Root directory (used by Python parser for relative paths). Defaults to process.cwd().
 * @returns Parse result with ASTs and any errors.
 */
export function parseFiles(files: WalkedFile[], targetDir: string = process.cwd()): ParseResult {
  const tsConfigPath = findTsConfig(targetDir);

  // When a tsconfig.json exists we inherit its compilerOptions (including
  // `paths` aliases) but still only analyze the files the walker selected.
  const project = new Project({
    ...(tsConfigPath
      ? { tsConfigFilePath: tsConfigPath }
      : {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.Node16,
            moduleResolution: ts.ModuleResolutionKind.Node16,
            strict: true,
            noEmit: true,
            allowJs: true,
            checkJs: true,
            skipLibCheck: true,
            esModuleInterop: true,
          },
        }),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false,
  });

  const sourceFiles: SourceFile[] = [];
  const pythonFiles: PythonParseResult[] = [];
  const errors: ParseError[] = [];
  
  let pythonParser: PythonParser | null = null;

  for (const file of files) {
    try {
      if (file.absolutePath.endsWith('.py')) {
        if (!pythonParser) {
          pythonParser = new PythonParser();
        }
        const pyResult = pythonParser.parseFile(file.absolutePath, targetDir);
        pythonFiles.push(pyResult);
      } else {
        const sourceFile = project.addSourceFileAtPath(file.absolutePath);
        sourceFiles.push(sourceFile);
      }
    } catch (e) {
      errors.push({
        file: file.relativePath,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { project, sourceFiles, pythonFiles, errors };
}
