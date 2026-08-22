/**
 * Rule: Page Structure
 *
 * Detects structural and semantic issues in the HTML document,
 * such as missing titles, multiple H1 tags, or empty bodies.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page } from 'playwright';
import { randomUUID } from 'node:crypto';

export const PageStructureRule: EngineRule = {
  id: 'web-page-structure',
  name: 'Page Structure and Semantics',
  engineType: 'web',
  category: 'page-structure',
  severity: 'low', // Mostly SEO/Accessibility, rarely critical security/functionality
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];

    await page.waitForLoadState('networkidle').catch(() => {});

    const issues = await page.evaluate(() => {
      const detected: Array<{ type: string; message: string; severity: 'high' | 'medium' | 'low' }> = [];

      // 1. Missing Title
      const title = document.querySelector('title');
      if (!title || !title.textContent || title.textContent.trim() === '') {
        detected.push({ 
          type: 'missing-title', 
          message: 'Page is missing a <title> tag or the title is empty.',
          severity: 'medium'
        });
      }

      // 2. Multiple H1 tags
      const h1s = document.querySelectorAll('h1');
      if (h1s.length === 0) {
        detected.push({
          type: 'missing-h1',
          message: 'Page is missing a main <h1> heading.',
          severity: 'low'
        });
      } else if (h1s.length > 1) {
        detected.push({
          type: 'multiple-h1',
          message: `Page has ${h1s.length} <h1> tags. There should ideally be only one main heading per page.`,
          severity: 'low'
        });
      }

      // 3. Empty Body
      const body = document.querySelector('body');
      if (!body || body.innerHTML.trim().length === 0) {
        detected.push({
          type: 'empty-body',
          message: 'The <body> of the page is empty.',
          severity: 'high'
        });
      }

      return detected;
    }).catch(() => []);

    const targetUrl = context.webContext.targetUrl;

    for (const issue of issues) {
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: this.category,
        severity: issue.severity,
        confidence: this.confidence,
        title: `Structure Issue: ${issue.type}`,
        message: issue.message,
        location: targetUrl,
        evidence: {
          issueType: issue.type,
        },
        remediation: 'Update the page HTML to adhere to semantic and structural best practices.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
