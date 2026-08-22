/**
 * Detector: Unhandled Promises
 *
 * Scans for function calls that return a Promise but are not:
 * - Awaited
 * - Returned
 * - Handled with .catch() or .then(..., ...)
 *
 * This catches subtle bugs like `fetch(url)` where the result is ignored,
 * or background tasks that can swallow errors.
 */

import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { Node, SyntaxKind, TypeFormatFlags } from 'ts-morph';

export const UnhandledPromiseRule: CodeRule = {
  id: 'unhandled-promise',
  name: 'Unhandled Promise',
  category: 'logic-error',
  severity: 'medium',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Find all CallExpressions (function/method calls)
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      // 1. Check if the call returns a Promise
      const type = callExpr.getReturnType();
      const typeText = type.getText(undefined, TypeFormatFlags.None);
      
      // Basic check: does the type text start with Promise?
      if (!typeText.startsWith('Promise<') && typeText !== 'Promise') {
        continue;
      }

      // If this call itself is .catch, .finally, or .then, we don't flag its return value
      // as an unhandled promise, because it's already part of a handling chain.
      const expression = callExpr.getExpression();
      if (Node.isPropertyAccessExpression(expression)) {
        const name = expression.getName();
        if (name === 'catch' || name === 'finally' || name === 'then') {
          continue;
        }
      }

      // 2. Check the parent chain to see how the promise is used
      let parent = callExpr.getParent();
      let isHandled = false;

      while (parent && (Node.isPropertyAccessExpression(parent) || Node.isCallExpression(parent))) {
        if (Node.isPropertyAccessExpression(parent)) {
          const name = parent.getName();
          if (name === 'catch' || name === 'finally' || name === 'then') {
            isHandled = true;
          }
        }
        parent = parent.getParent();
      }

      if (!parent) continue;

      // 3. Check terminal usage
      if (!isHandled) {
        if (Node.isAwaitExpression(parent)) {
          isHandled = true;
        } else if (Node.isReturnStatement(parent)) {
          isHandled = true;
        } else if (Node.isVariableDeclaration(parent)) {
          // e.g., const p = fetch(); -- assumed handled later (could be refined)
          isHandled = true; 
        } else if (Node.isArrowFunction(parent) && parent.getBody() === callExpr) {
          // e.g., () => fetch() -- implicitly returned
          isHandled = true;
        }
      }

      if (!isHandled && Node.isExpressionStatement(parent)) {
        // The call is just a floating expression statement: fetch();
        const start = callExpr.getStart();
        const pos = sourceFile.getLineAndColumnAtPos(start);
        
        findings.push({
          id: crypto.randomUUID(),
          projectId: context.projectId,
          runId: null,
          engine: 'code',
          ruleId: this.id,
          category: this.category,
          severity: this.severity,
          confidence: this.confidence,
          title: 'Unhandled promise rejection',
          message: `The function call '${callExpr.getExpression().getText()}' returns a Promise that is not awaited, returned, or caught.`,
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: callExpr.getText(),
          },
          remediation: 'Add an `await` before the call, or handle the promise rejection with `.catch()`.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
