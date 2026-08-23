import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import type { Project } from 'ts-morph';

const scannedProjects = new WeakSet<Project>();
const backendSchemas = new Map<string, Set<string>>();

export const PayloadMismatchRule: CodeRule = {
  id: 'payload-mismatch',
  name: 'Payload Schema Mismatch',
  category: 'cross-file',
  severity: 'high',
  confidence: 'low',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;
    const project = context.project;

    // 1. Gather Backend Expected Schemas (Run once per project)
    if (!scannedProjects.has(project)) {
      scannedProjects.add(project);
      backendSchemas.clear();

      for (const file of project.getSourceFiles()) {
        const callExprs = file.getDescendantsOfKind(SyntaxKind.CallExpression);
        for (const call of callExprs) {
          const expr = call.getExpression();
          if (Node.isPropertyAccessExpression(expr)) {
            const propName = expr.getName();
            // Look for app.post() or router.post()
            if (['post', 'put', 'patch'].includes(propName)) {
              const args = call.getArguments();
              if (args.length >= 2 && Node.isStringLiteral(args[0])) {
                const route = args[0].getLiteralText();
                
                // Find the handler function (last argument)
                const handler = args[args.length - 1];
                if (Node.isArrowFunction(handler) || Node.isFunctionExpression(handler)) {
                  const params = handler.getParameters();
                  if (params.length > 0 && params[0]) {
                    const reqParamNode = params[0].getNameNode();
                    if (!Node.isIdentifier(reqParamNode)) continue;
                    const reqParamName = reqParamNode.getText();
                    
                    // Now find all accesses like `req.body.X`
                    const expectedKeys = new Set<string>();
                    const propAccesses = handler.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                    for (const pa of propAccesses) {
                      if (pa.getExpression().getText() === `${reqParamName}.body`) {
                        expectedKeys.add(pa.getName());
                      }
                    }

                    // Also look for destructuring: const { x, y } = req.body;
                    const varDecls = handler.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
                    for (const vd of varDecls) {
                      const init = vd.getInitializer();
                      if (init && init.getText() === `${reqParamName}.body`) {
                        const nameNode = vd.getNameNode();
                        if (Node.isObjectBindingPattern(nameNode)) {
                          for (const element of nameNode.getElements()) {
                            expectedKeys.add(element.getNameNode().getText());
                          }
                        }
                      }
                    }

                    if (expectedKeys.size > 0) {
                      backendSchemas.set(route, expectedKeys);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Check Frontend Fetch Calls in this file
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (expr.getText() === 'fetch' || expr.getText() === 'axios.post') {
        const args = callExpr.getArguments();
        if (args.length > 0 && Node.isStringLiteral(args[0])) {
          let route = args[0].getLiteralText();
          
          try {
            route = new URL(route).pathname;
          } catch {
            // Not a full URL
          }

          const expectedKeys = backendSchemas.get(route);
          if (expectedKeys) {
            // Let's try to infer the payload sent by the frontend
            let providedKeys: Set<string> | null = null;

            if (expr.getText() === 'fetch' && args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
              const bodyProp = args[1].getProperty('body');
              if (bodyProp && Node.isPropertyAssignment(bodyProp)) {
                const bodyInit = bodyProp.getInitializer();
                // Check if it's JSON.stringify({ x: 1, y: 2 })
                if (bodyInit && Node.isCallExpression(bodyInit) && bodyInit.getExpression().getText() === 'JSON.stringify') {
                  const stringifyArgs = bodyInit.getArguments();
                  if (stringifyArgs.length > 0 && Node.isObjectLiteralExpression(stringifyArgs[0])) {
                    providedKeys = new Set();
                    for (const prop of stringifyArgs[0].getProperties()) {
                      if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
                        providedKeys.add(prop.getName());
                      }
                    }
                  }
                }
              }
            }

            if (providedKeys) {
              const missingFields = Array.from(expectedKeys).filter(key => !providedKeys!.has(key));
              
              if (missingFields.length > 0) {
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
                  title: 'Request/Response Payload Mismatch',
                  message: `Frontend sends a payload to '${route}', but it is missing fields expected by the backend: [${missingFields.join(', ')}].`,
                  location: `${context.relativePath}:${pos.line}:${pos.column}`,
                  evidence: {
                    file: context.relativePath,
                    line: pos.line,
                    column: pos.column,
                    expectedKeys: Array.from(expectedKeys),
                    providedKeys: Array.from(providedKeys),
                    code: callExpr.getText(),
                  },
                  remediation: `Update the frontend fetch payload to include the expected fields or update the backend to make them optional.`,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        }
      }
    }

    return findings;
  },
};
