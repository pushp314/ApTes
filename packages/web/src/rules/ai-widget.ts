import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';
import type { Page } from 'playwright';

export const AiWidgetRule: EngineRule = {
  id: 'web-ai-widget',
  name: 'AI/Chat Widget Detection',
  engineType: 'web',
  category: 'ai-widget',
  severity: 'info',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext?.page) {
      throw new Error('Web context with page is required');
    }
    const page = context.webContext.page as unknown as Page;
    const url = page.url();
    const findings: Finding[] = [];

    await page.waitForLoadState('networkidle').catch(() => {});

    try {
      // Use evaluate to avoid context destruction errors when navigating
      const targets = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-mcp-target]');
        return Array.from(els).map(el => el.getAttribute('data-mcp-target')).filter(Boolean) as string[];
      });

      for (const targetName of targets) {
        findings.push({
          id: randomUUID(),
          projectId: context.projectId,
          runId: context.runId,
          engine: 'web',
          ruleId: this.id,
          category: this.category,
          severity: 'info',
          confidence: 'high',
          title: 'AI Widget Detected',
          message: `Detected an AI widget configured to connect to target: ${targetName}`,
          location: url,
          evidence: {
            targetName
          },
          remediation: 'Ensure the connected target is secure and does not expose sensitive operations without authentication.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore context destruction errors
    }

    return findings;
  },
};
