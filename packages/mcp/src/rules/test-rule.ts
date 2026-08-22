import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export const ToolCountRule: EngineRule = {
  id: 'mcp-tool-count',
  name: 'Tool Count Validation',
  engineType: 'mcp',
  category: 'introspection',
  severity: 'info',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.mcpContext) {
      throw new Error('McpContext is missing');
    }

    const manifest = context.mcpContext.manifest;
    const findings: Finding[] = [];

    findings.push({
      id: randomUUID(),
      projectId: context.projectId,
      runId: context.runId,
      engine: 'mcp',
      ruleId: this.id,
      category: this.category,
      severity: this.severity,
      confidence: this.confidence,
      title: 'MCP Server Introspection Successful',
      message: `The server exposes ${manifest.tools.length} tools, ${manifest.resources.length} resources, and ${manifest.prompts.length} prompts.`,
      location: 'Server Manifest',
      evidence: {
        toolNames: manifest.tools.map(t => t.name),
        resourceNames: manifest.resources.map(r => r.name),
        promptNames: manifest.prompts.map(p => p.name),
      },
      remediation: 'No action required.',
      timestamp: new Date().toISOString(),
    });

    return findings;
  },
};
