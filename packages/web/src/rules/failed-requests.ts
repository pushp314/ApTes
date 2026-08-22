/**
 * Rule: Failed Requests
 *
 * Detects HTTP 4xx or 5xx responses for resources loaded by the page
 * (images, scripts, fetch/XHR, or the main document itself).
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page, Response } from 'playwright';
import { randomUUID } from 'node:crypto';

export const FailedRequestsRule: EngineRule = {
  id: 'web-failed-requests',
  name: 'Failed Network Requests',
  engineType: 'web',
  category: 'network-error',
  severity: 'medium', // Varies based on main document vs asset, but default medium
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];
    const failedResponses: Response[] = [];

    // Attach listener
    page.on('response', (response) => {
      const status = response.status();
      // Ignore 401/403 for now as they might be expected behavior on some pages,
      // but log 404s and 5xxs.
      if ((status >= 400 && status !== 401 && status !== 403) || status >= 500) {
        failedResponses.push(response);
      }
    });

    // Wait for the page to finish loading
    await page.waitForLoadState('networkidle').catch(() => {});

    for (const response of failedResponses) {
      const url = response.url();
      const status = response.status();
      const isMainFrame = response.request().resourceType() === 'document' && url === context.webContext.targetUrl;
      
      const severity = isMainFrame || status >= 500 ? 'high' : 'medium';
      
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: status >= 500 ? 'server-error' : 'client-error',
        severity,
        confidence: this.confidence,
        title: `HTTP ${status} on resource load`,
        message: `Request to ${url} failed with status ${status} (${response.statusText()}).`,
        location: url,
        evidence: {
          url,
          status,
          statusText: response.statusText(),
          resourceType: response.request().resourceType(),
          method: response.request().method(),
        },
        remediation: status >= 500 
          ? 'Investigate the server-side error causing the 5xx response.' 
          : 'Ensure the resource exists or remove the broken link/reference from the page.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
