import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';
import type { Page } from 'playwright';

interface WidgetSignal {
  detectionMethod: 'explicit-mcp-target' | 'known-widget-vendor' | 'widget-dom-marker' | 'mcp-endpoint';
  matchedValue: string;
  vendor?: string;
  targetName?: string;
}

/**
 * Detects real chat/AI widget integrations without treating a generic script
 * tag as a connection to an MCP target. Correlation only happens when an
 * explicit target name is present (a declared attribute or an MCP endpoint
 * hostname deliberately matched to a configured target name).
 */
export const AiWidgetRule: EngineRule = {
  id: 'web-ai-widget',
  name: 'AI/Chat Widget Detection',
  engineType: 'web',
  category: 'ai-widget',
  severity: 'info',
  confidence: 'low',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.webContext?.page) {
      throw new Error('Web context with page is required');
    }
    const page = context.webContext.page as unknown as Page;
    const findings: Finding[] = [];

    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();

    try {
      const signals = await page.evaluate((): WidgetSignal[] => {
        const discovered: WidgetSignal[] = [];
        const seen = new Set<string>();
        const add = (signal: WidgetSignal) => {
          const key = `${signal.detectionMethod}|${signal.vendor ?? ''}|${signal.targetName ?? ''}|${signal.matchedValue}`;
          if (!seen.has(key)) {
            seen.add(key);
            discovered.push(signal);
          }
        };

        // This remains supported as an explicit, auditable declaration. It is
        // not the only detection path, and it is the strongest correlation signal.
        for (const element of document.querySelectorAll<HTMLElement>('[data-mcp-target]')) {
          const targetName = element.dataset.mcpTarget?.trim();
          if (targetName) {
            add({ detectionMethod: 'explicit-mcp-target', matchedValue: targetName, targetName });
          }
        }

        const vendors: ReadonlyArray<{ name: string; pattern: RegExp }> = [
          { name: 'Intercom', pattern: /intercom(?:cdn|\.io|\.com)?/i },
          { name: 'Drift', pattern: /driftt?\.com|drift-widget/i },
          { name: 'Zendesk', pattern: /zopim\.com|zdassets\.com|zendesk/i },
          { name: 'Crisp', pattern: /crisp\.chat/i },
          { name: 'Tawk.to', pattern: /tawk\.to/i },
          { name: 'Chatwoot', pattern: /chatwoot/i },
          { name: 'Botpress', pattern: /botpress/i },
          { name: 'HubSpot chat', pattern: /hubspot.*(?:chat|conversations)|hs-scripts\.com/i },
          { name: 'SalesIQ', pattern: /salesiq|zoho.*chat/i },
        ];
        const mcpEndpoint = /(?:^|[/:._-])mcp(?:[/:._-]|$)|modelcontextprotocol/i;
        const widgetMarker = /(?:ai[-_ ]?(?:assistant|chat|copilot|agent)|chat[-_ ]?(?:widget|bot|launcher|assistant)|support[-_ ]?chat)/i;

        const inspectUrl = (value: string) => {
          for (const vendor of vendors) {
            if (vendor.pattern.test(value)) {
              add({ detectionMethod: 'known-widget-vendor', matchedValue: value, vendor: vendor.name });
              return;
            }
          }

          if (mcpEndpoint.test(value)) {
            let targetName: string | undefined;
            try {
              targetName = new URL(value, document.baseURI).hostname;
            } catch {
              // Preserve the endpoint observation even when it is a malformed URL.
            }
            add({ detectionMethod: 'mcp-endpoint', matchedValue: value, targetName });
          }
        };

        for (const element of document.querySelectorAll<HTMLScriptElement>('script[src]')) inspectUrl(element.src);
        for (const element of document.querySelectorAll<HTMLIFrameElement>('iframe[src]')) inspectUrl(element.src);
        for (const resource of performance.getEntriesByType('resource')) inspectUrl(resource.name);

        // Known vendors are not the only widgets in use. DOM markers catch
        // custom React/Next.js widgets while retaining low confidence.
        for (const element of Array.from(document.querySelectorAll<HTMLElement>('[class], [id], [data-testid], [aria-label], [title]')).slice(0, 500)) {
          const marker = [element.className, element.id, element.dataset.testid, element.getAttribute('aria-label'), element.title]
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .join(' ');
          if (widgetMarker.test(marker)) add({ detectionMethod: 'widget-dom-marker', matchedValue: marker.slice(0, 200) });
        }

        return discovered;
      });

      for (const signal of signals) {
        const hasExplicitTarget = Boolean(signal.targetName);
        const description = signal.vendor
          ? `${signal.vendor} integration`
          : signal.detectionMethod === 'mcp-endpoint'
            ? 'MCP-like endpoint'
            : 'chat/AI widget';
        findings.push({
          id: randomUUID(),
          projectId: context.projectId,
          runId: context.runId,
          engine: 'web',
          ruleId: this.id,
          category: this.category,
          severity: 'info',
          confidence: signal.detectionMethod === 'explicit-mcp-target' ? 'high' : 'low',
          title: hasExplicitTarget ? 'AI Widget or MCP Endpoint Detected' : 'AI/Chat Widget Detected',
          message: hasExplicitTarget
            ? `Detected ${description} connected to target '${signal.targetName}'.`
            : `Detected ${description}; no MCP target was inferred for correlation.`,
          location: url,
          evidence: {
            detectionMethod: signal.detectionMethod,
            matchedValue: signal.matchedValue,
            ...(signal.vendor ? { vendor: signal.vendor } : {}),
            ...(signal.targetName ? { targetName: signal.targetName } : {}),
          },
          remediation: hasExplicitTarget
            ? 'Ensure the connected target is authorized, secured, and does not expose sensitive operations without authentication.'
            : 'Verify the widget integration and explicitly map any connected MCP target before relying on cross-engine correlation.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // The page may be navigating or a target may block performance timing.
    }

    return findings;
  },
};
