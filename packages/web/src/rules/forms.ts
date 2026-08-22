/**
 * Rule: Form Discovery & Safe Validation
 *
 * Detects <form> elements and identifies common structural or accessibility
 * issues without actively submitting the form.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page } from 'playwright';
import { randomUUID } from 'node:crypto';

export const FormsRule: EngineRule = {
  id: 'web-forms',
  name: 'Form Discovery and Validation',
  engineType: 'web',
  category: 'form-validation',
  severity: 'medium',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];

    // We wait for the navigation and initial network idle to finish.
    await page.waitForLoadState('networkidle').catch(() => {});

    // Introspect the DOM for forms and inputs
    const formIssues = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const issues: Array<{ type: string; message: string; formId: string | null; formAction: string | null }> = [];

      forms.forEach((form, index) => {
        const id = form.id || `form-${index}`;
        const action = form.getAttribute('action');
        
        // 1. Missing action (Might be an SPA, but worth noting if it's a traditional site)
        if (!action && !form.onsubmit && !form.getAttribute('onsubmit')) {
           // We'll report this as low severity later since SPAs often handle submit via React/Vue listeners
           issues.push({ type: 'missing-action', message: 'Form is missing an action attribute and has no obvious onsubmit handler.', formId: id, formAction: null });
        }

        // 2. Missing Submit Button
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');
        if (!submitBtn) {
          issues.push({ type: 'missing-submit', message: 'Form has no identifiable submit button.', formId: id, formAction: action });
        }

        // 3. Inputs missing names (they won't be serialized in a standard submission)
        const inputs = form.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([type="reset"])');
        inputs.forEach(input => {
          if (!input.getAttribute('name')) {
            issues.push({ 
              type: 'unnamed-input', 
              message: `Input of type '${input.getAttribute('type') || 'text'}' is missing a 'name' attribute.`, 
              formId: id, 
              formAction: action 
            });
          }
        });
      });

      return issues;
    }).catch(() => []);

    const targetUrl = context.webContext.targetUrl;

    for (const issue of formIssues) {
      // Determine severity based on issue type
      let severity: 'high' | 'medium' | 'low' = 'medium';
      if (issue.type === 'missing-submit' || issue.type === 'unnamed-input') {
        severity = 'medium';
      } else if (issue.type === 'missing-action') {
        severity = 'low'; // SPAs do this often, so lower confidence/severity
      }

      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: this.category,
        severity,
        confidence: issue.type === 'missing-action' ? 'low' : 'high',
        title: `Form Issue: ${issue.type}`,
        message: issue.message,
        location: targetUrl,
        evidence: {
          formId: issue.formId,
          formAction: issue.formAction,
          issueType: issue.type,
        },
        remediation: 'Ensure the form has a submit button, all inputs have name attributes, and an action is defined if not an SPA.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
