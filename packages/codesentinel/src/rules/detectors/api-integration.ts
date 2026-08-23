import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const ApiIntegrationRule: CodeRule = {
  id: 'api-integration',
  name: 'API Integration',
  category: 'api-integration',
  severity: 'high',
  confidence: 'low',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Find all fetch calls
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      if (expression.getText() !== 'fetch') {
        continue;
      }

      // We found a fetch() call. Let's trace if its response is checked for `.ok`.
      let isOkChecked = false;
      const parent = callExpr.getParent();
      
      // A naive but deterministic check for MVP:
      // Does the containing block or function have `.ok` anywhere in its text?
      // Or does the file itself check `ok`?
      // Better: check if `await fetch()` is followed by checking `response.ok`.
      
      // Let's get the enclosing function or block
      const enclosingBlock = callExpr.getFirstAncestorByKind(SyntaxKind.Block);
      if (enclosingBlock) {
        const text = enclosingBlock.getText();
        if (text.includes('.ok') || text.includes('status === 200') || text.includes('status >= 200')) {
          isOkChecked = true;
        }
      } else {
        // If it's a floating fetch, `unhandled-promise` already flags it, but let's check text anyway
        if (parent && parent.getText().includes('.ok')) {
          isOkChecked = true;
        }
      }

      if (!isOkChecked) {
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
          title: 'Missing API Error Handling',
          message: `The fetch() call does not appear to check the response.ok property. This can lead to unhandled HTTP errors.`,
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: callExpr.getText(),
          },
          remediation: 'Check `if (!response.ok)` after awaiting fetch, and throw or handle the error.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
