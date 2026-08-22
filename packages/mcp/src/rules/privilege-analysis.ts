import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

const FS_VERBS = ['read_file', 'write_file', 'list_dir', 'delete_file', 'read_dir', 'write', 'read'];
const NETWORK_VERBS = ['fetch', 'request', 'http_get', 'curl', 'download'];
const DANGEROUS_VERBS = [
  'execute', 'run', 'delete', 'drop', 'remove', 'bash', 'shell', 'query',
  'command', 'eval', 'exec'
];

export const PrivilegeAnalysisRule: EngineRule = {
  id: 'mcp-privilege-analysis',
  name: 'MCP Privilege and Capability Analysis',
  engineType: 'mcp',
  category: 'privilege-escalation',
  severity: 'high',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.mcpContext) {
      throw new Error('McpContext is missing');
    }

    const manifest = context.mcpContext.manifest;
    const findings: Finding[] = [];

    for (const tool of manifest.tools) {
      const nameLower = tool.name.toLowerCase();
      const descLower = (tool.description || '').toLowerCase();
      
      const foundGeneric = DANGEROUS_VERBS.filter(verb => nameLower.includes(verb) || new RegExp(`\\b${verb}\\b`, 'i').test(descLower));
      const foundFs = FS_VERBS.filter(verb => nameLower.includes(verb));
      const foundNet = NETWORK_VERBS.filter(verb => nameLower.includes(verb));

      const isGenericDangerous = foundGeneric.length > 0;
      const isFs = foundFs.length > 0;
      const isNet = foundNet.length > 0;

      if (!isGenericDangerous && !isFs && !isNet) {
        continue;
      }

      const schema = tool.inputSchema as Record<string, unknown> | undefined;
      let hasUnboundedInput = false;
      
      if (schema && schema.properties) {
        for (const propDef of Object.values(schema.properties as Record<string, unknown>)) {
          const p = propDef as Record<string, unknown>;
          if (p.type === 'string' && !p.enum && !p.pattern) {
            hasUnboundedInput = true;
          }
          if (p.type === 'object' && p.additionalProperties !== false) {
            hasUnboundedInput = true;
          }
        }
      } else if (!schema || schema.type !== 'object') {
         hasUnboundedInput = true;
      }

      if (isFs && hasUnboundedInput) {
        findings.push(createFinding(context, tool, 'critical', 'Unscoped Filesystem Access', `Tool exposes filesystem operations (${foundFs.join(', ')}) but accepts unbounded inputs, risking arbitrary file read/write or path traversal.`, foundFs));
      } else if (isFs) {
        findings.push(createFinding(context, tool, 'info', 'Scoped Filesystem Access', `Tool exposes filesystem operations (${foundFs.join(', ')}) but inputs appear safely scoped via enums or patterns.`, foundFs));
      }

      if (isNet && hasUnboundedInput) {
        findings.push(createFinding(context, tool, 'high', 'Unscoped Network Access', `Tool exposes network operations (${foundNet.join(', ')}) but accepts unbounded inputs, risking SSRF.`, foundNet));
      } else if (isNet) {
        findings.push(createFinding(context, tool, 'info', 'Scoped Network Access', `Tool exposes network operations (${foundNet.join(', ')}) but inputs appear safely scoped.`, foundNet));
      }

      if (isGenericDangerous && hasUnboundedInput) {
        findings.push(createFinding(context, tool, 'critical', 'Dangerous Capability with Unbounded Inputs', `Tool exposes dangerous capabilities (${foundGeneric.join(', ')}) but lacks strict input constraints, risking RCE or injection.`, foundGeneric));
      } else if (isGenericDangerous) {
        findings.push(createFinding(context, tool, 'info', 'Dangerous Capability Detected', `Tool exposes dangerous capabilities (${foundGeneric.join(', ')}). Inputs appear to be constrained, but verify server-side authorization.`, foundGeneric));
      }
    }

    return findings;
  },
};

function createFinding(context: EngineContext, tool: { name: string; description?: string; inputSchema?: unknown }, severity: Finding['severity'], titlePrefix: string, message: string, verbs: string[]): Finding {
  return {
    id: randomUUID(),
    projectId: context.projectId,
    runId: context.runId,
    engine: 'mcp',
    ruleId: 'mcp-privilege-analysis',
    category: 'privilege-escalation',
    severity,
    confidence: 'high',
    title: `${titlePrefix}: ${tool.name}`,
    message,
    location: `Tool: ${tool.name}`,
    evidence: { toolName: tool.name, verbs, schema: tool.inputSchema },
    remediation: 'Restrict tools using tight string enums, regex patterns, or human-in-the-loop approvals.',
    timestamp: new Date().toISOString(),
  };
}
