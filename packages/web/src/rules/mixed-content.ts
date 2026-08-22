/**
 * Rule: Mixed Content
 *
 * Detects HTTP requests made from a page loaded over HTTPS,
 * which compromises the TLS integrity of the page.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page, Request } from 'playwright';
import { randomUUID } from 'node:crypto';

export const MixedContentRule: EngineRule = {
  id: 'web-mixed-content',
  name: 'Mixed Content Detection',
  engineType: 'web',
  category: 'security-vulnerability', // Actual vulnerability (active compromise of TLS)
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];
    const mixedContentRequests: Request[] = [];
    
    const targetUrl = context.webContext.targetUrl;
    const isHttps = targetUrl.startsWith('https://');

    // Only applicable if the main document is loaded securely
    if (!isHttps) {
      return findings;
    }

    // Attach listener for all outgoing requests
    page.on('request', (request) => {
      const requestUrl = request.url();
      // If the request is http:// and not targeting localhost (some internal tooling might do this, but rare)
      if (requestUrl.startsWith('http://') && !requestUrl.includes('localhost') && !requestUrl.includes('127.0.0.1')) {
        mixedContentRequests.push(request);
      }
    });

    await page.waitForLoadState('networkidle').catch(() => {});

    for (const request of mixedContentRequests) {
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: this.category,
        severity: this.severity,
        confidence: this.confidence,
        title: 'Mixed Content (HTTP on HTTPS)',
        message: `The HTTPS page requested an insecure HTTP resource: ${request.url()}`,
        location: targetUrl,
        evidence: {
          insecureUrl: request.url(),
          resourceType: request.resourceType(),
        },
        remediation: 'Ensure all resources (scripts, images, stylesheets, XHR) are loaded over HTTPS.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
