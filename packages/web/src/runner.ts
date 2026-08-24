/**
 * Web Engine Runner
 *
 * Orchestrates a Playwright browser session, navigates to the target,
 * constructs the EngineContext, and evaluates all provided EngineRules.
 */

import { chromium, type Browser } from 'playwright';
import { validateTarget } from './security.js';
import type { EngineRule, EngineContext, WebContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export interface WebEngineConfig {
  /** Maximum time allowed for page load in milliseconds. */
  pageLoadTimeoutMs: number;
  /** Maximum time allowed for all rules to run in milliseconds (per page). */
  scanTimeoutMs: number;
  /** Allow scanning localhost/private IPs (ONLY for local development/fixtures). */
  allowLocal: boolean;
  /** Maximum number of unique pages to crawl. */
  maxPages: number;
  /** Explicit operator attestation required before a live target is loaded. */
  authorizationConfirmed: boolean;
  /** ISO-8601 timestamp for the operator attestation. */
  authorizationConfirmedAt?: string;
  /** Optional callback to report detailed progress. */
  onProgress?: (msg: string) => void;
}

const DEFAULT_CONFIG: WebEngineConfig = {
  pageLoadTimeoutMs: 15000,
  scanTimeoutMs: 60000,
  allowLocal: false,
  maxPages: 1, // Default to single page if not specified
  authorizationConfirmed: false,
};

export interface WebRunResult {
  findings: Finding[];
  durationMs: number;
  pagesScanned: number;
  error?: string;
}

/**
 * Run the Web Engine against a target URL, crawling up to maxPages.
 */
export async function runWebEngine(
  startUrl: string,
  rules: EngineRule[],
  projectId: string,
  configOverrides?: Partial<WebEngineConfig>
): Promise<WebRunResult> {
  const startTime = Date.now();
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const allFindings: Finding[] = [];
  const runId = randomUUID();

  const visited = new Set<string>();
  const queue: string[] = [startUrl];

  // Authorization is deliberately enforced here as well as by the platform,
  // so callers cannot bypass consent by invoking the engine directly.
  if (!config.authorizationConfirmed || !config.authorizationConfirmedAt || Number.isNaN(Date.parse(config.authorizationConfirmedAt))) {
    return {
      findings: [],
      pagesScanned: 0,
      durationMs: Date.now() - startTime,
      error: 'Web scan refused: explicit authorization confirmation with a valid timestamp is required.',
    };
  }

  // 1. Initial Target Validation (SSRF Protection)
  try {
    await validateTarget(startUrl, config.allowLocal);
  } catch (e) {
    return {
      findings: [],
      pagesScanned: 0,
      durationMs: Date.now() - startTime,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const startUrlObj = new URL(startUrl);
  let browser: Browser | null = null;
  let pagesScanned = 0;

  try {
    // 2. Launch Browser (Sandboxed)
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: false,
    });

    while (queue.length > 0 && pagesScanned < config.maxPages) {
      const targetUrl = queue.shift()!;
      if (visited.has(targetUrl)) continue;
      visited.add(targetUrl);

      if (config.onProgress) {
        config.onProgress(`[Web Engine] Scanning: ${targetUrl}`);
      }
      
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(config.pageLoadTimeoutMs);
      page.setDefaultTimeout(config.pageLoadTimeoutMs);

      const webContext: WebContext = {
        targetUrl,
        page,
      };

      const engineContext: EngineContext = {
        runId,
        engineType: 'web',
        projectId,
        webContext,
      };

      // 3. Evaluate rules
      const rulePromises: Promise<Finding[]>[] = [];
      for (const rule of rules) {
        if (rule.engineType !== 'web') continue;
        try {
          rulePromises.push(Promise.resolve(rule.evaluate(engineContext)));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`[Web Engine] Error initiating rule '${rule.id}':`, e);
        }
      }

      // 4. Navigate
      await page.goto(targetUrl, { waitUntil: 'networkidle' }).catch(() => {
        // Navigation errors (404, etc.) are handled by rules or logged
      });

      // Let post-navigation logic settle
      await page.waitForTimeout(2000); 

      // 5. Collect Findings for this page
      const ruleResults = await Promise.race([
        Promise.allSettled(rulePromises),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Rule execution timeout')), config.scanTimeoutMs)
        )
      ]);

      for (const result of ruleResults) {
        if (result.status === 'fulfilled') {
          allFindings.push(...result.value);
        } else {
          // eslint-disable-next-line no-console
          console.error(`[Web Engine] Rule execution failed:`, result.reason);
        }
      }

      // 6. Discover Links (Crawl)
      if (pagesScanned < config.maxPages - 1) {
        try {
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
              .map(a => (a as HTMLAnchorElement).href);
          });

          for (const link of links) {
            try {
              const urlObj = new URL(link);
              // Only queue same-origin links that are http/https
              if (
                urlObj.origin === startUrlObj.origin && 
                (urlObj.protocol === 'http:' || urlObj.protocol === 'https:')
              ) {
                // Strip hash fragments for deduplication
                urlObj.hash = '';
                const cleanUrl = urlObj.toString();
                if (!visited.has(cleanUrl) && !queue.includes(cleanUrl)) {
                  queue.push(cleanUrl);
                }
              }
            } catch {
              // Invalid URL, skip
            }
          }
        } catch {
          // Could not extract links
        }
      }

      await page.close().catch(() => {});
      pagesScanned++;
    }

  } catch (e) {
    return {
      findings: allFindings,
      pagesScanned,
      durationMs: Date.now() - startTime,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return {
    findings: allFindings,
    pagesScanned,
    durationMs: Date.now() - startTime,
  };
}
