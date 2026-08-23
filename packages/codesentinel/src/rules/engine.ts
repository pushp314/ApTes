/**
 * CodeSentinel Rule Engine.
 *
 * Runs a suite of detection rules against parsed source files.
 */

import type { Finding } from '@sentinel/shared';
import type { ParseResult } from '../parser.js';
import type { CodeRule, CodeRuleContext } from './rule.js';
import * as path from 'node:path';

/**
 * Result of running the rule engine.
 */
export interface EngineResult {
  /** All findings discovered during analysis. */
  findings: Finding[];

  /** Number of files analyzed. */
  filesAnalyzed: number;

  /** Wall-clock duration of the analysis in milliseconds. */
  durationMs: number;
}

/** Optional engine-wide behaviour switches threaded into every rule context. */
export interface RunRulesOptions {
  /** Suppress ts-type-error diagnostics (useful for JS-only projects). */
  skipTypeErrors?: boolean;
}

/**
 * Run a set of rules against the parsed project.
 *
 * @param parseResult - The result of the parsing phase.
 * @param rules - The active detection rules to run.
 * @param projectId - The project identifier.
 * @param rootDir - The root directory of the project (for relative paths).
 * @param options - Optional behaviour switches.
 * @returns The engine result containing all findings.
 */
export function runRules(
  parseResult: ParseResult,
  rules: CodeRule[],
  projectId: string,
  rootDir: string,
  options: RunRulesOptions = {},
): EngineResult {
  const startTime = Date.now();
  const findings: Finding[] = [];

  for (const sourceFile of parseResult.sourceFiles) {
    const absolutePath = sourceFile.getFilePath();
    const relativePath = path.relative(rootDir, absolutePath);

    const context: CodeRuleContext = {
      project: parseResult.project,
      sourceFile,
      projectId,
      relativePath,
      targetDir: rootDir,
      parseResult,
      skipTypeErrors: options.skipTypeErrors ?? false,
    };

    for (const rule of rules) {
      try {
        const ruleFindings = rule.analyze(context);
        findings.push(...ruleFindings);
      } catch (e) {
        // Log error but do not crash the engine
        // eslint-disable-next-line no-console
        console.error(
          `[Rule Engine] Error running rule '${rule.id}' on file '${relativePath}':`,
          e,
        );
      }
    }
  }

  return {
    findings,
    filesAnalyzed: parseResult.sourceFiles.length,
    durationMs: Date.now() - startTime,
  };
}
