import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import { resolveExpression } from '../data-flow.js';

export const McpExposureRule: CodeRule = {
  id: 'mcp-exposure',
  name: 'MCP Endpoint Exposure',
  category: 'security',
  severity: 'low', // It's only Critical if missing auth is found
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Look for express/fastify route definitions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const propName = expr.getName();
        if (['get', 'post', 'put', 'delete', 'patch', 'use', 'all'].includes(propName)) {
          const args = callExpr.getArguments();
          if (args.length >= 2) {
            const routeArg = args[0];
            if (!routeArg) continue;
            
            const origins = resolveExpression(routeArg);
            
            for (const origin of origins) {
              if (Node.isStringLiteral(origin)) {
                const routeText = origin.getLiteralText();
                
                // Now check if the handler (the last argument or any argument after route)
                // invokes an MCP client.
                const mcpClientCalls = callExpr.getDescendantsOfKind(SyntaxKind.CallExpression).filter(c => {
                  const cText = c.getExpression().getText();
                  return cText.includes('client.callTool') || 
                         cText.includes('mcp.callTool') ||
                         cText.includes('mcpClient') ||
                         cText.includes('Client(');
                });

                if (mcpClientCalls.length > 0) {
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
                    title: 'API Route Exposes MCP Client',
                    message: `Route '${routeText}' directly invokes an MCP client. This is a potential risk path if unauthenticated.`,
                    location: `${context.relativePath}:${pos.line}:${pos.column}`,
                    evidence: {
                      file: context.relativePath,
                      line: pos.line,
                      column: pos.column,
                      code: callExpr.getText(),
                      route: routeText,
                    },
                    remediation: 'Ensure this route is authenticated and inputs are sanitized.',
                    timestamp: new Date().toISOString(),
                  });
                  break; // Prevent duplicate findings for the same route
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
