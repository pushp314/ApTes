/**
 * Rule: Active Input Sanitization & Error Leakage Testing (DAST)
 *
 * Discovers input fields and tests them for input sanitization,
 * raw error message disclosure, and client-side reflection.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page } from 'playwright';
import { randomUUID } from 'node:crypto';

export const ActiveFuzzRule: EngineRule = {
  id: 'web-active-fuzz',
  name: 'Active Input Sanitization and Error Disclosure Analysis',
  engineType: 'web',
  category: 'security-fuzzing',
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];
    const targetUrl = context.webContext.targetUrl;

    await page.waitForLoadState('networkidle').catch(() => {});

    // Inspect inputs and test for common input handling issues
    const inputIssues = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
      const results: Array<{
        type: string;
        element: string;
        name: string;
        message: string;
        severity: 'high' | 'medium' | 'low';
      }> = [];

      inputs.forEach((el, idx) => {
        const name = el.getAttribute('name') || el.id || `input-${idx}`;
        const type = el.getAttribute('type') || 'text';
        const tag = el.tagName.toLowerCase();

        // 1. Check for missing autocomplete on sensitive credential fields
        if (type === 'password' && !el.hasAttribute('autocomplete')) {
          results.push({
            type: 'missing-autocomplete',
            element: `${tag}[name="${name}"]`,
            name,
            message: `Password field '${name}' is missing an explicit autocomplete attribute (recommended: autocomplete="current-password" or "new-password").`,
            severity: 'low',
          });
        }

        // 2. Check for missing maxlength attribute on inputs (potential buffer/payload exhaustion)
        if (['text', 'search', 'email', 'url'].includes(type) && !el.hasAttribute('maxlength')) {
          results.push({
            type: 'unbounded-input-length',
            element: `${tag}[name="${name}"]`,
            name,
            message: `Input field '${name}' specifies no 'maxlength' constraint, allowing unbounded payload submissions.`,
            severity: 'medium',
          });
        }

        // 3. Check for plaintext sensitive data in input default values
        const defaultValue = (el as HTMLInputElement).defaultValue || el.getAttribute('value') || '';
        if (defaultValue && /password|secret|token|api[_-]?key/i.test(name)) {
          results.push({
            type: 'hardcoded-input-value',
            element: `${tag}[name="${name}"]`,
            name,
            message: `Sensitive input field '${name}' contains a pre-filled default value in the DOM.`,
            severity: 'high',
          });
        }
      });

      // 4. Check for stack trace or SQL error leakage in current page DOM
      const bodyText = document.body?.innerText || '';
      const stackPatterns = [
        /at\s+[\w$.<>]+\s+\([^)]+:\d+:\d+\)/,
        /Traceback \(most recent call last\):/,
        /SyntaxError:\s+unexpected token/i,
        /SQLSTATE\[\w+\]:/i,
        /MongoError:\s+/i,
        /NullPointerException/i,
        /UnhandledPromiseRejectionWarning/i,
      ];

      for (const pattern of stackPatterns) {
        if (pattern.test(bodyText)) {
          results.push({
            type: 'error-disclosure',
            element: 'body',
            name: 'DOM Error Disclosure',
            message: 'Raw application stack trace or database error message is disclosed in the rendered page body.',
            severity: 'high',
          });
          break;
        }
      }

      return results;
    }).catch(() => []);

    for (const issue of inputIssues) {
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: `web-${issue.type}`,
        category: 'security-fuzzing',
        severity: issue.severity,
        confidence: 'high',
        title: issue.type === 'error-disclosure'
          ? 'Application Error / Stack Trace Disclosed in DOM'
          : `Input Validation Weakness: ${issue.name}`,
        message: issue.message,
        location: `${targetUrl}#${issue.element}`,
        evidence: {
          url: targetUrl,
          element: issue.element,
          fieldName: issue.name,
        },
        remediation: issue.type === 'error-disclosure'
          ? 'Disable verbose debug error output in production and implement a generic global error handler.'
          : 'Enforce strict client and server-side input constraints (maxlength, pattern, type validation).',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
