import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind, Node } from 'ts-morph';
import { resolveExpression, isTaintSource } from '../data-flow.js';

export const OpenRedirectRule: CodeRule = {
  id: 'open-redirect',
  name: 'Open Redirect Vulnerability',
  category: 'security',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      const text = expr.getText();

      const isRedirectCall = text.endsWith('.redirect') || text === 'redirect';

      if (isRedirectCall) {
        const args = callExpr.getArguments();
        if (args.length === 0) continue;

        // In Express: res.redirect([status,] url); url is either 1st or 2nd arg
        const firstArg = args[0];
        const urlArg = args.length === 2 && firstArg && firstArg.getKind() === SyntaxKind.NumericLiteral ? args[1] : firstArg;
        if (!urlArg) continue;

        // Check if argument is a hardcoded static string literal (e.g. res.redirect('/dashboard'))
        if (Node.isStringLiteral(urlArg) || Node.isNoSubstitutionTemplateLiteral(urlArg)) {
          const val = urlArg.getLiteralText();
          if (val.startsWith('/') && !val.startsWith('//')) {
            continue; // Safe relative redirect
          }
        }

        let isTainted = false;
        const origins = resolveExpression(urlArg);

        for (const origin of origins) {
          if (isTaintSource(origin) || origin.getText().includes('req.query') || origin.getText().includes('req.params') || origin.getText().includes('searchParams.get')) {
            isTainted = true;
            break;
          }
        }

        // Also check direct text of urlArg
        if (!isTainted && (urlArg.getText().includes('req.query') || urlArg.getText().includes('searchParams.get') || urlArg.getText().includes('req.body'))) {
          isTainted = true;
        }

        if (isTainted) {
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
            title: 'Unvalidated Open Redirect',
            message: `User-controlled input is passed directly to '${text}()' without domain whitelist validation.`,
            location: `${context.relativePath}:${pos.line}:${pos.column}`,
            evidence: {
              file: context.relativePath,
              line: pos.line,
              column: pos.column,
              code: callExpr.getText(),
            },
            remediation: 'Validate redirect URLs against a strict whitelist of allowed domains or enforce relative path redirects (e.g., verifying url.startsWith("/") and !url.startsWith("//")).',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};
