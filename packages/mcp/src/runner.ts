import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { EngineRule, EngineContext, Finding, TargetManifest, ServerMetadata } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export interface McpRunOptions {
  command: string;
  args?: string[];
  /** Explicit operator attestation required before starting the target. */
  authorizationConfirmed?: boolean;
  /** ISO-8601 timestamp for the operator attestation. */
  authorizationConfirmedAt?: string;
  /**
   * Deliberately supplied environment values for the subprocess. These are
   * merged into a small safe base; the parent environment is never inherited.
   */
  env?: Record<string, string>;
  scanTimeoutMs?: number;
}

export interface McpEngineResult {
  runId: string;
  projectId: string;
  durationMs: number;
  findings: Finding[];
  error?: string;
}

/**
 * This is an environment boundary, not a complete OS sandbox. The target
 * still needs container/VM isolation to restrict its network and filesystem.
 */
export function createRestrictedSubprocessEnv(overrides?: Record<string, string>): Record<string, string> {
  const environment: Record<string, string> = {
    PATH: process.env.PATH ?? '',
  };

  return { ...environment, ...overrides };
}

export async function runMcpEngine(
  rules: EngineRule[],
  projectId: string,
  options: McpRunOptions
): Promise<McpEngineResult> {
  const runId = randomUUID();
  const startTime = Date.now();
  const findings: Finding[] = [];
  const timeoutMs = options.scanTimeoutMs || 30000;

  if (!options.authorizationConfirmed || !options.authorizationConfirmedAt || Number.isNaN(Date.parse(options.authorizationConfirmedAt))) {
    return {
      runId,
      projectId,
      durationMs: Date.now() - startTime,
      findings,
      error: 'MCP scan refused: explicit authorization confirmation with a valid timestamp is required.',
    };
  }

  // Safeguards: hard scan timeout and an explicit PATH-only environment (plus
  // caller-provided overrides). This is not OS isolation: the target still has
  // the invoking account's filesystem and network permissions; use a VM/container.
  const transport = new StdioClientTransport({
    command: options.command,
    args: options.args || [],
    env: createRestrictedSubprocessEnv(options.env),
  });

  const client = new Client(
    {
      name: 'sentinel-mcp-engine',
      version: '0.1.0',
    },
    {
      capabilities: {},
    }
  );

  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    const scanPromise = (async () => {
      await client.connect(transport);
      
      const serverMeta: ServerMetadata = {
        name: client.getServerVersion()?.name || 'unknown',
        version: client.getServerVersion()?.version || 'unknown',
        transport: 'stdio',
      };

      const manifest: TargetManifest = {
        tools: [],
        resources: [],
        prompts: []
      };

      // 1. Fetch Tools
      try {
        const toolsResult = await client.listTools();
        manifest.tools = toolsResult.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as Record<string, unknown>
        }));
      } catch {
        // Some servers might not support tools
      }

      // 2. Fetch Resources
      try {
        const resourcesResult = await client.listResources();
        manifest.resources = resourcesResult.resources.map(r => ({
          name: r.name,
          description: r.description,
          uri: r.uri
        }));
      } catch {
        // Some servers might not support resources
      }

      // 3. Fetch Prompts
      try {
        const promptsResult = await client.listPrompts();
        manifest.prompts = promptsResult.prompts.map(p => ({
          name: p.name,
          description: p.description
        }));
      } catch {
        // Some servers might not support prompts
      }

      const context: EngineContext = {
        runId,
        projectId,
        engineType: 'mcp',
        mcpContext: {
          manifest,
          serverMeta,
        }
      };

      // Execute all rules concurrently
      const rulePromises = rules
        .filter(r => r.engineType === 'mcp')
        .map(async (rule) => {
          try {
            const ruleFindings = await rule.evaluate(context);
            findings.push(...ruleFindings);
          } catch (ruleError) {
            findings.push({
              id: randomUUID(),
              projectId,
              runId,
              engine: 'mcp',
              ruleId: 'internal-rule-error',
              category: 'internal-error',
              severity: 'high',
              confidence: 'high',
              title: `Rule Execution Failed: ${rule.name}`,
              message: `The rule threw an unexpected error during evaluation: ${(ruleError as Error).message}`,
              location: 'Internal Runner',
              evidence: { error: (ruleError as Error).stack },
              remediation: 'Fix the rule implementation.',
              timestamp: new Date().toISOString(),
            });
          }
        });

      await Promise.all(rulePromises);
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('MCP scan timed out')), timeoutMs);
    });

    await Promise.race([scanPromise, timeoutPromise]);

    return {
      runId,
      projectId,
      durationMs: Date.now() - startTime,
      findings,
    };
  } catch (error) {
    return {
      runId,
      projectId,
      durationMs: Date.now() - startTime,
      findings,
      error: (error as Error).message,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Ensure we close the transport/subprocess
    await client.close().catch(() => {});
  }
}
