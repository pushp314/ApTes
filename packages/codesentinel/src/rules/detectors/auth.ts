import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import { resolveExpression } from '../data-flow.js';

/** Keywords that mark a route path as security-sensitive. */
const SENSITIVE_ROUTE_KEYWORDS = [
  'admin',
  'settings',
  'dashboard',
  'billing',
  'delete',
  'account',
  'password',
  'secret',
];

function isSensitiveRoute(routeText: string): boolean {
  const lower = routeText.toLowerCase();
  if (SENSITIVE_ROUTE_KEYWORDS.some(k => lower.includes(k))) return true;
  return lower.includes('user') &&
    ['delete', 'update', 'edit', 'create'].some(a => lower.includes(a));
}

/** Identifiers that suggest authentication is enforced inside a handler body. */
const AUTH_HINT_PATTERN = /auth|session|token|jwt|permission|guard|middleware|currentUser|getServerSession|verifyToken/i;

/**
 * Derive the URL path of a Next.js App Router API route from its file path.
 * e.g. `app/api/admin/users/route.ts` -> `/api/admin/users` (matches the
 * runtime URL so cross-engine correlation can compare it with live traffic).
 */
function nextApiRouteFromPath(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!/(^|\/)app\/api\/.+\/route\.(ts|tsx|js|jsx|mjs|cjs)$/.test(normalized)) {
    return null;
  }

  const start = normalized.indexOf('app/api/');
  const end = normalized.lastIndexOf('/route.');
  return '/' + normalized.slice(start + 'app/'.length, end);
}

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
        if (['get', 'post', 'put', 'delete', 'patch', 'use', 'all'].includes(propName)) {
          const args = callExpr.getArguments();
          if (args.length >= 2) {
            const routeArg = args[0];
            if (!routeArg) continue;
            
            const origins = resolveExpression(routeArg);
            
            for (const origin of origins) {
              if (Node.isStringLiteral(origin)) {
                const routeText = origin.getLiteralText();
                
                const isSensitive = routeText.includes('admin') || 
                                    routeText.includes('settings') || 
                                    routeText.includes('dashboard') ||
                                    routeText.includes('billing') ||
                                    routeText.includes('delete') ||
                                    routeText.includes('account') ||
                                    routeText.includes('password') ||
                                    routeText.includes('secret') ||
                                    (routeText.includes('user') && (routeText.includes('delete') || routeText.includes('update') || routeText.includes('edit') || routeText.includes('create')));

                if (isSensitive) {
                  let isMissingAuth = false;
                  if (args.length === 2) {
                    isMissingAuth = true;
                  } else if (args.length >= 3) {
                    const midArg = args[1];
                    if (Node.isArrayLiteralExpression(midArg) && midArg.getElements().length === 0) {
                      isMissingAuth = true;
                    }
                  }

                  if (isMissingAuth) {
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
                        route: routeText,
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

    const nextFindings = analyzeNextApiRoutes(context);
    findings.push(...nextFindings);

    return findings;
  },
};

/**
 * Detect Next.js App Router API route handlers (`export function GET/POST/...`
 * inside `app/api/**\/route.ts`) that handle sensitive routes without any
 * authentication-related code in the handler body.
 */
function analyzeNextApiRoutes(context: CodeRuleContext): Finding[] {
  const routePath = nextApiRouteFromPath(context.relativePath);
  if (!routePath || !isSensitiveRoute(routePath)) {
    return [];
  }

  const sourceFile = context.sourceFile;
  const findings: Finding[] = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const statement of sourceFile.getStatements()) {
    let handlerName: string | null = null;
    let bodyText: string | null = null;

    if (Node.isFunctionDeclaration(statement)) {
      const name = statement.getName();
      if (name && httpMethods.includes(name)) {
        handlerName = name;
        bodyText = statement.getBody()?.getText() ?? '';
      }
    } else if (Node.isVariableStatement(statement)) {
      for (const decl of statement.getDeclarations()) {
        const name = decl.getName();
        if (httpMethods.includes(name)) {
          handlerName = name;
          bodyText = decl.getInitializer()?.getText() ?? '';
        }
      }
    }

    if (!handlerName) continue;

    // Heuristic: a sensitive Next.js API route with zero auth-related
    // identifiers anywhere in its handler body is treated as missing auth.
    if (bodyText !== null && AUTH_HINT_PATTERN.test(bodyText)) continue;

    const pos = sourceFile.getLineAndColumnAtPos(statement.getStart());

    findings.push({
      id: crypto.randomUUID(),
      projectId: context.projectId,
      runId: null,
      engine: 'code',
      ruleId: 'missing-auth',
      category: 'security',
      severity: 'high',
      confidence: 'low',
      title: 'Missing Authentication on Sensitive Route',
      message: `Next.js API route '${routePath}' (${handlerName}) appears sensitive but contains no authentication logic.`,
      location: `${context.relativePath}:${pos.line}:${pos.column}`,
      evidence: {
        file: context.relativePath,
        line: pos.line,
        column: pos.column,
        code: statement.getText().slice(0, 500),
        route: routePath,
      },
      remediation: 'Add session/token verification (e.g. getServerSession, auth()) to this route handler.',
      timestamp: new Date().toISOString(),
    });
  }

  return findings;
}
