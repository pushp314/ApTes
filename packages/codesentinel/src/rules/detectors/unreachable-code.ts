/**
 * Detector: Unreachable Code
 *
 * Scans block statements for code that appears after a terminal statement
 * (return, throw, break, continue).
 */

import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { Node, SyntaxKind, type Statement } from 'ts-morph';

export const UnreachableCodeRule: CodeRule = {
  id: 'unreachable-code',
  name: 'Unreachable Code',
  category: 'logic-error',
  severity: 'low',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    // Find all blocks (function bodies, if blocks, loops, etc.)
    const blocks = sourceFile.getDescendantsOfKind(SyntaxKind.Block);
    
    // Also check the top-level SourceFile itself (which acts like a block)
    const allContainers = [...blocks, sourceFile];

    for (const container of allContainers) {
      let statements: Statement[] = [];
      
      if (Node.isSourceFile(container)) {
        statements = container.getStatements();
      } else if (Node.isBlock(container)) {
        statements = container.getStatements();
      }

      let terminalIndex = -1;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (
          Node.isReturnStatement(stmt) ||
          Node.isThrowStatement(stmt) ||
          Node.isBreakStatement(stmt) ||
          Node.isContinueStatement(stmt)
        ) {
          terminalIndex = i;
          break;
        }
      }

      // If there are statements AFTER the terminal statement
      if (terminalIndex !== -1 && terminalIndex < statements.length - 1) {
        const unreachableStmt = statements[terminalIndex + 1];
        if (!unreachableStmt) continue;
        
        // Exclude function/class declarations, as they are hoisted and can technically appear after returns
        if (
          Node.isFunctionDeclaration(unreachableStmt) ||
          Node.isClassDeclaration(unreachableStmt) ||
          Node.isInterfaceDeclaration(unreachableStmt) ||
          Node.isTypeAliasDeclaration(unreachableStmt)
        ) {
          continue;
        }

        const start = unreachableStmt.getStart();
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
          title: 'Unreachable code detected',
          message: 'Code exists after a terminal statement (return, throw, break, or continue) and will never be executed.',
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: unreachableStmt.getText().substring(0, 50) + (unreachableStmt.getText().length > 50 ? '...' : ''),
          },
          remediation: 'Remove the unreachable code or adjust the control flow so it can be executed.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
