import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const LogicContradictionsRule: CodeRule = {
  id: 'logic-contradictions',
  name: 'Logic Contradictions',
  category: 'logic-error',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const ifStatements = sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement);

    for (const ifStmt of ifStatements) {
      const expr = ifStmt.getExpression();
      const text = expr.getText().trim();
      
      let isContradiction = false;
      let message = '';
      
      if (text === 'true' || text === 'false') {
        isContradiction = true;
        message = `Always-${text} condition detected in if statement. This is either dead code or an infinite loop risk.`;
      } else if (text.includes('=== true &&') && text.includes('=== false')) {
        isContradiction = true;
        message = `Contradictory conditions detected: cannot be true and false simultaneously.`;
      }

      if (isContradiction) {
        const start = expr.getStart();
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
          title: 'Illogical Condition',
          message: message,
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: text,
          },
          remediation: 'Refactor the logic to be dynamic or remove the dead code.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
