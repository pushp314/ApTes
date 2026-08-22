import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export const TransportSecurityRule: EngineRule = {
  id: 'mcp-transport-security',
  name: 'MCP Transport Security Validation',
  engineType: 'mcp',
  category: 'transport-security',
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.mcpContext) {
      throw new Error('McpContext is missing');
    }

    const serverMeta = context.mcpContext.serverMeta;
    const findings: Finding[] = [];

    // Local stdio is intrinsically safe from network sniffing
    if (serverMeta.transport === 'stdio') {
      return [];
    }

    // For HTTP/SSE, verify TLS is used
    if (serverMeta.transport === 'http' || serverMeta.transport === 'sse') {
      if (serverMeta.tls === false) {
        findings.push({
          id: randomUUID(),
          projectId: context.projectId,
          runId: context.runId,
          engine: 'mcp',
          ruleId: this.id,
          category: this.category,
          severity: 'high',
          confidence: 'high',
          title: 'Unencrypted Remote Transport (Missing TLS)',
          message: `The MCP server is using an unencrypted remote transport (${serverMeta.transport}) without TLS. Credentials, prompts, and tool results are sent in plaintext and vulnerable to interception.`,
          location: 'Server Metadata',
          evidence: { transport: serverMeta.transport, tls: false },
          remediation: 'Enable HTTPS/WSS on the remote MCP server or proxy it through a secure tunnel.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
