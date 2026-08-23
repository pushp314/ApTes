import { CodeRule } from '../rule.js';
import type { Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';
import { Node, SyntaxKind } from 'ts-morph';

export const BusinessLogicAiRule: CodeRule = {
  id: 'business-logic-ai',
  name: 'Business Logic AI Auditor',
  category: 'business-logic',
  severity: 'medium',
  confidence: 'low',
  
  analyze(context) {
    const findings: Finding[] = [];
    if (!context.parseResult) return findings;

    const routeNodes: Node[] = [];
    for (const sourceFile of context.parseResult.sourceFiles) {
      const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          const propName = expr.getName();
          if (['post', 'put', 'patch', 'delete'].includes(propName)) {
            const args = call.getArguments();
            if (args.length >= 2 && Node.isStringLiteral(args[0])) {
              const handler = args[args.length - 1];
              if (Node.isArrowFunction(handler) || Node.isFunctionExpression(handler)) {
                routeNodes.push(handler);
              }
            }
          }
        }
      }
    }

    // Ideally, this rule would asynchronously send each routeNode.getText() to Ollama
    // to ask for business logic flaws (e.g. race conditions, coupon abuse).
    // For synchronous execution in the AST engine phase, we emit a low-confidence 
    // finding for complex routes (e.g. > 10 lines) to flag them for the AiReviewer step!
    for (const route of routeNodes) {
      const text = route.getText();
      const lines = text.split('\\n');
      if (lines.length > 10) {
        findings.push({
          id: randomUUID(),
          projectId: context.projectId,
          runId: null,
          engine: 'code',
          ruleId: 'business-logic-ai',
          category: 'business-logic',
          severity: 'medium',
          confidence: 'low', // Crucial: triggers the Platform AiReviewer!
          title: 'Complex Route Handler - Pending AI Business Logic Audit',
          message: 'This route handler is complex enough to harbor business logic flaws (e.g., race conditions, state machine bypasses) that static AST cannot catch. Sent to local LLM for deeper semantic analysis.',
          location: `${route.getSourceFile().getFilePath()}:${route.getStartLineNumber()}`,
          evidence: {
            handlerCode: text
          },
          remediation: 'Review the AI Assessment attached to this finding to see if the LLM discovered any semantic exploits.',
          timestamp: new Date().toISOString()
        });
      }
    }

    return findings;
  }
};
