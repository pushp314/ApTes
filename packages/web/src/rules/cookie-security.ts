/**
 * Rule: Cookie Security
 *
 * Checks all cookies set by the page (or returned in responses)
 * for secure configurations (Secure, HttpOnly, SameSite).
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page } from 'playwright';
import { randomUUID } from 'node:crypto';

export const CookieSecurityRule: EngineRule = {
  id: 'web-cookie-security',
  name: 'Cookie Security Validation',
  engineType: 'web',
  category: 'security-configuration',
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];

    await page.waitForLoadState('networkidle').catch(() => {});

    const targetUrl = context.webContext.targetUrl;
    const isHttps = targetUrl.startsWith('https://');
    
    // Retrieve all cookies for the current browser context
    const cookies = await page.context().cookies();

    for (const cookie of cookies) {
      const issues: string[] = [];

      if (!cookie.secure && isHttps) {
        issues.push('Missing Secure flag');
      }

      if (!cookie.httpOnly) {
        issues.push('Missing HttpOnly flag');
      }

      if (!cookie.sameSite || cookie.sameSite === 'None') {
        // If SameSite is None, it MUST have the Secure flag (enforced by modern browsers, but still good to flag)
        issues.push('Missing or weak SameSite attribute');
      }

      if (issues.length > 0) {
        findings.push({
          id: randomUUID(),
          projectId: context.projectId,
          runId: context.runId,
          engine: 'web',
          ruleId: this.id,
          category: this.category,
          severity: 'medium', // High if we knew it was a session cookie, but we default to medium for general cookies
          confidence: this.confidence,
          title: `Insecure Cookie: ${cookie.name}`,
          message: `Cookie '${cookie.name}' is insecure. Issues: ${issues.join(', ')}.`,
          location: targetUrl,
          evidence: {
            cookieName: cookie.name,
            domain: cookie.domain,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
          },
          remediation: 'Ensure all sensitive cookies are set with Secure, HttpOnly, and SameSite=Lax (or Strict) attributes.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
