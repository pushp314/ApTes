import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import { resolveExpression } from '../data-flow.js';

export const InjectionRule: CodeRule = {
  id: 'injection-risk',
  name: 'Injection Risk',
  category: 'security',
  severity: 'critical',
  confidence: 'low',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      const text = expr.getText();
      
      const isDbCall = text.includes('db.query') || text.includes('db.execute') || text === 'query';
      const isExecCall = text === 'exec' || text === 'execSync' || text === 'spawn';

      if (isDbCall || isExecCall) {
        // Look at arguments
        const args = callExpr.getArguments();
        
        for (const arg of args) {
          const origins = resolveExpression(arg);
          let isInsecure = false;

          for (const origin of origins) {
            if (Node.isTemplateExpression(origin)) {
              isInsecure = true;
              break;
            } else if (Node.isBinaryExpression(origin)) {
              const op = origin.getOperatorToken();
              if (op.getKind() === SyntaxKind.PlusToken) {
                isInsecure = true;
                break;
              }
            }
          }

          if (isInsecure) {
            const start = callExpr.getStart();
            const pos = sourceFile.getLineAndColumnAtPos(start);
            
            const injectionType = isDbCall ? 'SQL Injection' : 'Command Injection';
            
            findings.push({
              id: crypto.randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: this.id,
              category: this.category,
              severity: this.severity,
              confidence: this.confidence,
              title: `${injectionType} Risk`,
              message: `Unsafe string interpolation or concatenation detected in a sensitive ${isDbCall ? 'database' : 'system'} call. This creates an injection vulnerability.`,
              location: `${context.relativePath}:${pos.line}:${pos.column}`,
              evidence: {
                file: context.relativePath,
                line: pos.line,
                column: pos.column,
                code: callExpr.getText(),
              },
              remediation: isDbCall 
                ? 'Use parameterized queries or prepared statements.' 
                : 'Avoid passing user input directly to system commands. Use safe array arguments.',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return findings;
  },
};
