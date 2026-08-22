/**
 * Rule: Console Errors
 *
 * Detects uncaught JavaScript errors or explicit `console.error` logs
 * emitted by the page during load and initial evaluation.
 */

import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import type { Page, ConsoleMessage } from 'playwright';
import { randomUUID } from 'node:crypto';

export const ConsoleErrorsRule: EngineRule = {
  id: 'web-console-errors',
  name: 'Console Errors',
  engineType: 'web',
  category: 'runtime-error',
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext) {
      throw new Error('WebContext is missing');
    }

    const page = context.webContext.page as Page;
    const findings: Finding[] = [];
    const errors: ConsoleMessage[] = [];

    // Attach listener immediately (before navigation completes)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg);
      }
    });
    
    // Also catch unhandled page errors (e.g. uncaught exceptions)
    page.on('pageerror', (exception) => {
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: 'uncaught-exception',
        severity: 'high',
        confidence: 'high',
        title: 'Uncaught JavaScript Exception',
        message: exception.message,
        location: context.webContext?.targetUrl,
        evidence: {
          stack: exception.stack,
        },
        remediation: 'Fix the JavaScript runtime error causing the exception.',
        timestamp: new Date().toISOString(),
      });
    });

    // We wait for the navigation and initial network idle to finish.
    // The runner gives us 2 seconds post-navigation before it collects results.
    // We can just sleep or wait for a specific signal, but for these simple
    // listeners, returning a promise that resolves after a short delay is enough.
    // Wait for the page load state
    await page.waitForLoadState('networkidle').catch(() => {});

    // Process collected console errors
    for (const msg of errors) {
      const location = msg.location();
      findings.push({
        id: randomUUID(),
        projectId: context.projectId,
        runId: context.runId,
        engine: 'web',
        ruleId: this.id,
        category: this.category,
        severity: this.severity,
        confidence: this.confidence,
        title: 'Console Error Detected',
        message: msg.text(),
        location: `${location.url || context.webContext.targetUrl}:${location.lineNumber || 0}`,
        evidence: {
          text: msg.text(),
          location,
        },
        remediation: 'Resolve the console error to ensure the page functions correctly.',
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
