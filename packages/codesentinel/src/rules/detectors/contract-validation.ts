import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';

export const ContractValidationRule: CodeRule = {
  id: 'contract-mismatch',
  name: 'Contract Mismatch',
  category: 'cross-file',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;
    const project = sourceFile.getProject();

    // 1. Gather all backend routes defined across the entire project (naive MVP approach)
    // We only want to compute this once per run, but since CodeRule interface is per-file,
    // we compute it dynamically. In a production scanner, this would be a multi-pass architecture.
    const backendRoutes = new Set<string>();
    
    // Simple caching mechanism to avoid re-parsing all files for every single file scanned
    // We'll attach it to a global or just accept the slight performance hit for MVP.
    const allFiles = project.getSourceFiles();
    for (const file of allFiles) {
      const callExprs = file.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of callExprs) {
        const expr = call.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          const propName = expr.getName();
          if (['get', 'post', 'put', 'delete', 'patch'].includes(propName)) {
            const args = call.getArguments();
            if (args.length >= 2 && Node.isStringLiteral(args[0])) {
              backendRoutes.add(args[0].getLiteralText());
            }
          }
        }
      }
    }

    // 2. Check frontend fetch calls in the CURRENT file
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (expr.getText() === 'fetch' || expr.getText() === 'axios.get' || expr.getText() === 'axios.post') {
        const args = callExpr.getArguments();
        if (args.length > 0 && Node.isStringLiteral(args[0])) {
          let route = args[0].getLiteralText();
          
          // Naive normalization (e.g. "http://localhost:3000/api/users" -> "/api/users")
          try {
            const url = new URL(route);
            route = url.pathname;
          } catch {
            // Not a full URL, use as is
          }

          // If it looks like an internal API route but isn't in our backend set
          if (route.startsWith('/api') && !backendRoutes.has(route)) {
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
              title: 'API Contract Mismatch',
              message: `Frontend calls route '${route}', but this route is not defined in the backend source code.`,
              location: `${context.relativePath}:${pos.line}:${pos.column}`,
              evidence: {
                file: context.relativePath,
                line: pos.line,
                column: pos.column,
                code: callExpr.getText(),
              },
              remediation: 'Ensure the backend route exists or update the frontend fetch call to the correct path.',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return findings;
  },
};
