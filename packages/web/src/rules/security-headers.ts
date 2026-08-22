/**
 * Rule: Security Headers
 *
 * Checks the main document response for missing or weakly configured
 * HTTP security headers (CSP, HSTS, X-Frame-Options, etc.).
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page, Response } from 'playwright';
import { randomUUID } from 'node:crypto';

function createFinding(
  rule: EngineRule,
  context: EngineContext,
  targetUrl: string,
  title: string,
  message: string,
  severity: 'high' | 'medium' | 'low',
  remediation: string
): Finding {
  return {
    id: randomUUID(),
    projectId: context.projectId,
    runId: context.runId,
    engine: 'web',
    ruleId: rule.id,
    category: rule.category,
    severity,
    confidence: rule.confidence,
    title,
    message,
    location: targetUrl,
    evidence: { title },
    remediation,
    timestamp: new Date().toISOString(),
  };
}

export const SecurityHeadersRule: EngineRule = {
  id: 'web-security-headers',
  name: 'Security Headers Validation',
  engineType: 'web',
  category: 'security-configuration',
  severity: 'medium',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];
    let mainResponse: Response | null = null;

    // Listen for the main document response
    page.on('response', (response) => {
      if (response.request().resourceType() === 'document' && response.url() === context.webContext?.targetUrl) {
        mainResponse = response;
      }
    });

    await page.waitForLoadState('networkidle').catch(() => {});

    // TypeScript might think mainResponse is still null here because it's assigned in a callback.
    // We cast it to prevent the 'never' type error.
    const response = mainResponse as Response | null;

    if (response) {
      const headers = await response.allHeaders();
      const targetUrl = response.url();
      const urlObj = new URL(targetUrl);

      // Check Strict-Transport-Security (HSTS) - Only relevant if served over HTTPS
      if (urlObj.protocol === 'https:') {
        const hsts = headers['strict-transport-security'];
        if (!hsts) {
          findings.push(createFinding(
            this, context, targetUrl, 'Missing HSTS Header',
            'The Strict-Transport-Security header is missing. This exposes the site to protocol downgrade attacks.',
            'high', 'Ensure HSTS is configured with a long max-age (e.g., max-age=31536000; includeSubDomains).'
          ));
        }
      }

      // Check Content-Security-Policy (CSP)
      const csp = headers['content-security-policy'];
      if (!csp) {
        findings.push(createFinding(
          this, context, targetUrl, 'Missing Content-Security-Policy',
          'The Content-Security-Policy header is missing. CSP is a critical defense against XSS attacks.',
          'high', 'Implement a strict Content-Security-Policy.'
        ));
      } else if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        findings.push(createFinding(
          this, context, targetUrl, 'Weak Content-Security-Policy',
          'The Content-Security-Policy contains unsafe directives (\'unsafe-inline\' or \'unsafe-eval\').',
          'medium', 'Remove unsafe directives and use nonces or hashes for scripts.'
        ));
      }

      // Check X-Frame-Options (or frame-ancestors in CSP)
      const xFrameOptions = headers['x-frame-options'];
      if (!xFrameOptions && (!csp || !csp.includes('frame-ancestors'))) {
        findings.push(createFinding(
          this, context, targetUrl, 'Missing Clickjacking Protection',
          'Neither X-Frame-Options nor CSP frame-ancestors is present, leaving the site vulnerable to clickjacking.',
          'medium', 'Set X-Frame-Options to DENY or SAMEORIGIN, or configure CSP frame-ancestors.'
        ));
      }

      // Check X-Content-Type-Options
      const xContentTypeOptions = headers['x-content-type-options'];
      if (!xContentTypeOptions || xContentTypeOptions.toLowerCase() !== 'nosniff') {
        findings.push(createFinding(
          this, context, targetUrl, 'Missing X-Content-Type-Options',
          'The X-Content-Type-Options header is missing or not set to nosniff. This can lead to MIME-sniffing attacks.',
          'low', 'Set X-Content-Type-Options: nosniff.'
        ));
      }
    }

    return findings;
  },
};
