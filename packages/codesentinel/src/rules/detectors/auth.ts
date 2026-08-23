import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import { resolveExpression } from '../data-flow.js';

export const AuthRule: CodeRule = {
  id: 'missing-auth',
  name: 'Missing Authentication',
  category: 'security',
  severity: 'high',
  confidence: 'low',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Look for express/fastify route definitions: app.get, router.post, etc.
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        // Common HTTP methods
        if (['get', 'post', 'put', 'delete', 'patch'].includes(propName)) {
          const args = callExpr.getArguments();
          if (args.length >= 2) {
            const routeArg = args[0];
            if (!routeArg) continue;
            
            const origins = resolveExpression(routeArg);
            
            for (const origin of origins) {
              if (Node.isStringLiteral(origin)) {
                const routeText = origin.getLiteralText();
                
                const isSensitive = routeText.includes('admin') || 
                                    routeText.includes('user') || 
                                    routeText.includes('settings') || 
                                    routeText.includes('dashboard') ||
                                    routeText.includes('billing');

                if (isSensitive) {
                  // Check how many arguments are passed. 
                  // Normally app.get('/admin', requireAuth, handler) => 3 args
                  // If it's just app.get('/admin', handler) => 2 args
                  // This is a naive heuristic for MVP.
                  if (args.length === 2) {
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
                      title: 'Missing Authentication on Sensitive Route',
                      message: `Route '${routeText}' appears sensitive but lacks middleware arguments before the handler.`,
                      location: `${context.relativePath}:${pos.line}:${pos.column}`,
                      evidence: {
                        file: context.relativePath,
                        line: pos.line,
                        column: pos.column,
                        code: callExpr.getText(),
                      },
                      remediation: 'Apply authentication/authorization middleware to this route.',
                      timestamp: new Date().toISOString(),
                    });
                    break; // Prevent duplicate findings for the same callExpr
                  }
                }
              }
            }
          }
        }
      }
    }

    return findings;
  },
};
