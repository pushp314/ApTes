/**
 * Rule: Basic Performance
 *
 * Captures basic page navigation timing metrics using the browser's
 * Performance API. Flags unusually slow page loads.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page } from 'playwright';
import { randomUUID } from 'node:crypto';

// Flag if the page takes longer than 3000ms to reach 'loadEventEnd'
const SLOW_LOAD_THRESHOLD_MS = 3000;

export const PerformanceRule: EngineRule = {
  id: 'web-performance',
  name: 'Basic Performance Metrics',
  engineType: 'web',
  category: 'performance',
  severity: 'low',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];

    // Wait until the load event has fired so metrics are fully populated
    await page.waitForLoadState('load').catch(() => {});

    const metrics = await page.evaluate(() => {
      // Use the modern Navigation Timing API (Level 2) if available
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        return {
          loadTime: nav.loadEventEnd - nav.startTime,
          domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
          timeToFirstByte: nav.responseStart - nav.requestStart,
        };
      }
      
      // Fallback to deprecated timing API if Level 2 is not available
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        timeToFirstByte: timing.responseStart - timing.requestStart,
      };
    }).catch(() => null);

    if (metrics && metrics.loadTime > SLOW_LOAD_THRESHOLD_MS) {
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: this.category,
        severity: this.severity,
        confidence: this.confidence,
        title: 'Slow Page Load',
        message: `Page took ${Math.round(metrics.loadTime)}ms to load, exceeding the ${SLOW_LOAD_THRESHOLD_MS}ms threshold.`,
        location: context.webContext.targetUrl,
        evidence: {
          loadTimeMs: metrics.loadTime,
          domContentLoadedMs: metrics.domContentLoaded,
          timeToFirstByteMs: metrics.timeToFirstByte,
        },
        remediation: 'Investigate server response time or optimize frontend assets to improve load time.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
