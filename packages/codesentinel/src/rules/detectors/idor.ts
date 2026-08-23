import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';

export const IdorRule: CodeRule = {
  id: 'idor-risk',
  name: 'Insecure Direct Object Reference (IDOR)',
  category: 'security',
  severity: 'high',
  confidence: 'low',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (['get', 'post', 'put', 'delete', 'patch'].includes(propName)) {
          const args = callExpr.getArguments();
          if (args.length === 0) continue;
          
          // IDOR usually happens on endpoints like /users/:id
          const handler = args[args.length - 1]; // The last argument is usually the handler
          
          if (handler && (Node.isArrowFunction(handler) || Node.isFunctionExpression(handler))) {
            const handlerText = handler.getText().replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
            
            // Heuristic 1: Does it extract a parameter like req.params.id?
            const usesParams = handlerText.includes('.params.') || handlerText.includes('.query.');
            
            // Heuristic 2: Does it call a database?
            const callsDb = handlerText.includes('db.query') || handlerText.includes('db.execute') || handlerText.includes('.find(') || handlerText.includes('.findOne(');
            
            // Heuristic 3: Does it verify the authenticated user?
            const verifiesUser = handlerText.includes('.user') || handlerText.includes('.session');

            if (usesParams && callsDb && !verifiesUser) {
              const start = callExpr.getStart();
              const pos = sourceFile.getLineAndColumnAtPos(start);
              
              let codeEvidence = callExpr.getText();
              if (codeEvidence.length > 200) {
                codeEvidence = codeEvidence.substring(0, 197) + '...';
              }
              
              findings.push({
                id: crypto.randomUUID(),
                projectId: context.projectId,
                runId: null,
                engine: 'code',
                ruleId: this.id,
                category: this.category,
                severity: this.severity,
                confidence: this.confidence,
                title: 'Insecure Direct Object Reference (IDOR) Risk',
                message: `Route handler fetches data using client-provided parameters without verifying ownership against the authenticated user session.`,
                location: `${context.relativePath}:${pos.line}:${pos.column}`,
                evidence: {
                  file: context.relativePath,
                  line: pos.line,
                  column: pos.column,
                  code: codeEvidence,
                },
                remediation: 'Ensure database queries are scoped to the authenticated user ID (e.g., WHERE id = ? AND owner_id = req.user.id).',
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    return findings;
  },
};
