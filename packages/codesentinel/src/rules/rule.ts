/**
 * CodeSentinel Rule Interface.
 *
 * Defines the contract for all static analysis detection rules in CodeSentinel.
 * These rules operate on ts-morph ASTs and produce `Finding` objects that
 * comply with the shared platform contract.
 */

import type { Finding, Severity, Confidence } from '@sentinel/shared';
import type { SourceFile, Project } from 'ts-morph';

/**
 * Context provided to a rule during evaluation.
 */
export interface CodeRuleContext {
  /** The ts-morph project containing all parsed files and type information. */
  project: Project;

  /** The specific file being analyzed. */
  sourceFile: SourceFile;

  /** The ID of the project being scanned (for finding metadata). */
  projectId: string;

  /** The relative path of the file being scanned (for finding metadata). */
  relativePath: string;
}

/**
 * A detection rule for CodeSentinel.
 */
export interface CodeRule {
  /** Unique identifier for the rule (e.g., 'unhandled-promise'). */
  id: string;

  /** Human-readable name for the rule. */
  name: string;

  /** Category grouping (e.g., 'type-error', 'logic-error'). */
  category: string;

  /** Default severity of findings produced by this rule. */
  severity: Severity;

  /** Default confidence of findings produced by this rule. */
  confidence: Confidence;

  /**
   * Analyze a single source file and return an array of findings.
   *
   * @param context - The analysis context containing the AST.
   * @returns An array of findings (empty array if no issues detected).
   */
  analyze(context: CodeRuleContext): Finding[];
}
