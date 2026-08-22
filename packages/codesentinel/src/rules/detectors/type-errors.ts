/**
 * Detector: Type Errors
 *
 * Uses the TypeScript compiler API (via ts-morph) to extract semantic diagnostics.
 * This effectively catches:
 * - Missing symbols (undeclared variables)
 * - Type mismatches
 * - Null/undefined risks (if strictNullChecks is on, which is default)
 * - Broken imports (module not found)
 */

import * as crypto from 'node:crypto'; // Use webcrypto if preferred, but node:crypto is fine for UUIDs
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { ts } from 'ts-morph';

export const TypeErrorRule: CodeRule = {
  id: 'ts-type-error',
  name: 'TypeScript Type Error',
  category: 'type-error',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Get semantic diagnostics (type errors, missing symbols, etc.)
    // We filter for errors only (skip warnings/suggestions for now)
    const diagnostics = sourceFile.getPreEmitDiagnostics().filter(
      (d) => d.getCategory() === ts.DiagnosticCategory.Error,
    );

    for (const diag of diagnostics) {
      const messageText = diag.getMessageText();
      const message =
        typeof messageText === 'string'
          ? messageText
          : ts.flattenDiagnosticMessageText(messageText.compilerObject, '\n');

      const start = diag.getStart();
      let line = 1;
      let column = 1;

      if (start !== undefined) {
        const pos = sourceFile.getLineAndColumnAtPos(start);
        line = pos.line;
        column = pos.column;
      }

      // Missing symbol: TS2304 (Cannot find name 'X')
      // Broken import: TS2307 (Cannot find module 'X'), TS2305 (has no exported member)
      // Null/undefined risk: TS2532 (Object is possibly 'undefined'), TS18048 (possibly 'undefined')
      const code = diag.getCode();
      let category = this.category;
      if (code === 2304) {
        category = 'missing-symbol';
      } else if (code === 2307 || code === 2305) {
        category = 'broken-import';
      } else if (code === 2532 || code === 18048) {
        // Object is possibly 'undefined'
        category = 'null-undefined-risk';
      }

      findings.push({
        id: crypto.randomUUID(), // Standard webcrypto/node random UUID
        projectId: context.projectId,
        runId: null, // Code imports have no runId
        engine: 'code',
        ruleId: this.id,
        category,
        severity: this.severity,
        confidence: this.confidence,
        title: `TS${code}: ${message.split('\n')[0]}`, // First line as title
        message: message,
        location: `${context.relativePath}:${line}:${column}`,
        evidence: {
          file: context.relativePath,
          line,
          column,
          tsErrorCode: code,
        },
        remediation: 'Fix the TypeScript error indicated by the compiler.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
