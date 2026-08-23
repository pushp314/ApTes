import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';

export const SecretsRule: CodeRule = {
  id: 'hardcoded-secret',
  name: 'Hardcoded Secret',
  category: 'security',
  severity: 'critical',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);

    const secretPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,     // OpenAI / generic secret keys
      /ghp_[a-zA-Z0-9]{36}/,     // Github personal access tokens
      /xox[baprs]-[a-zA-Z0-9]+/, // Slack tokens
      /-----BEGIN PRIVATE KEY-----/
    ];

    for (const strNode of stringLiterals) {
      const text = strNode.getLiteralValue();
      
      let matchedPattern = false;
      for (const pattern of secretPatterns) {
        if (pattern.test(text)) {
          matchedPattern = true;
          break;
        }
      }

      // Also check variable names for common bad practices like `const password = "admin"`
      if (!matchedPattern) {
        const parent = strNode.getParent();
        if (Node.isVariableDeclaration(parent) || Node.isPropertyAssignment(parent)) {
          const nameNode = Node.isVariableDeclaration(parent) ? parent.getNameNode() : parent.getNameNode();
          const varName = nameNode.getText().toLowerCase();
          
          if ((varName.includes('password') || varName.includes('secret') || varName.includes('api_key') || varName.includes('token')) 
              && text.length > 3 
              && text !== 'password' 
              && !text.includes('$')) {
            matchedPattern = true;
          }
        }
      }

      if (matchedPattern) {
        const start = strNode.getStart();
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
          title: 'Hardcoded Secret Detected',
          message: `A hardcoded credential or secret key was detected in the source code.`,
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            // REDACTED in evidence as per architecture rules
            code: 'REDACTED',
          },
          remediation: 'Move secrets to environment variables or a secure vault. Revoke the exposed credential immediately.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
