import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';

export const PrototypePollutionRule: CodeRule = {
  id: 'prototype-pollution',
  name: 'Prototype Pollution Vulnerability',
  category: 'security',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // 1. Check for direct __proto__ or prototype assignments
    const elementAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.ElementAccessExpression);

    for (const elemExpr of elementAccessExpressions) {
      const arg = elemExpr.getArgumentExpression();
      if (!arg) continue;

      const argText = arg.getText().replace(/['"]/g, '');
      if (argText === '__proto__' || argText === 'prototype' || argText === 'constructor') {
        const parent = elemExpr.getParent();
        // Check if it's on the left side of a binary expression (assignment)
        if (Node.isBinaryExpression(parent) && parent.getLeft() === elemExpr) {
          const start = elemExpr.getStart();
          const pos = sourceFile.getLineAndColumnAtPos(start);

          findings.push({
            id: crypto.randomUUID(),
            projectId: context.projectId,
            runId: null,
            engine: 'code',
            ruleId: this.id,
            category: this.category,
            severity: 'critical',
            confidence: 'high',
            title: 'Direct Prototype Pollution via Magic Property',
            message: `Direct assignment to '${argText}' detected. Modifying object prototypes affects all objects across the runtime.`,
            location: `${context.relativePath}:${pos.line}:${pos.column}`,
            evidence: {
              file: context.relativePath,
              line: pos.line,
              column: pos.column,
              code: parent.getText(),
            },
            remediation: "Never assign directly to '__proto__' or 'prototype'. Use Object.create(null) or Map for key-value collections.",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 2. Check for recursive merge/extend loops missing prototype checks
    const forInStatements = sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement);
    for (const forIn of forInStatements) {
      const bodyText = forIn.getStatement().getText();
      const hasProtoCheck = bodyText.includes('__proto__') || bodyText.includes('hasOwnProperty') || bodyText.includes('Object.hasOwn');
      const hasRecursiveMerge = bodyText.includes('merge') || bodyText.includes('extend') || bodyText.includes('clone');

      if (hasRecursiveMerge && !hasProtoCheck) {
        const start = forIn.getStart();
        const pos = sourceFile.getLineAndColumnAtPos(start);

        findings.push({
          id: crypto.randomUUID(),
          projectId: context.projectId,
          runId: null,
          engine: 'code',
          ruleId: this.id,
          category: this.category,
          severity: 'high',
          confidence: 'low',
          title: 'Unsafe Recursive Object Merge (Prototype Pollution Risk)',
          message: "Object merge/clone loop does not check or filter '__proto__' or 'constructor' keys before recursive assignment.",
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: forIn.getText().slice(0, 300),
          },
          remediation: "Filter dangerous keys like '__proto__' and 'constructor' before merging objects, or use Object.assign() with validated inputs.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
