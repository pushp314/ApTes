import type { EngineRule, EngineContext, Finding, McpToolInfo } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export const SchemaRigorRule: EngineRule = {
  id: 'mcp-schema-rigor',
  name: 'MCP Tool Schema Rigor Analysis',
  engineType: 'mcp',
  category: 'schema-rigor',
  severity: 'medium',
  confidence: 'high',

  async evaluate(context: EngineContext): Promise<Finding[]> {
    if (!context.mcpContext) {
      throw new Error('McpContext is missing');
    }

    const manifest = context.mcpContext.manifest;
    const findings: Finding[] = [];

    for (const tool of manifest.tools) {
      if (!tool.inputSchema) {
        findings.push(createFinding(context, tool, 'Missing Input Schema', 'The tool has no inputSchema defined.', 'low'));
        continue;
      }

      const schema = tool.inputSchema;

      if (schema.type !== 'object') {
        findings.push(createFinding(context, tool, 'Invalid Schema Root', `Root schema type is '${schema.type}', expected 'object'.`, 'high'));
        continue;
      }

      // Check for opaque object
      if (!schema.properties || Object.keys(schema.properties).length === 0) {
        // If it allows additionalProperties implicitly or explicitly, it's opaque
        if (schema.additionalProperties !== false) {
          findings.push(createFinding(context, tool, 'Opaque Object Schema', 'The tool accepts an object but defines no properties, allowing arbitrary payloads.', 'high'));
        }
      }

      // Check required fields
      if (!schema.required || !Array.isArray(schema.required) || schema.required.length === 0) {
        if (schema.properties && Object.keys(schema.properties).length > 0) {
          findings.push(createFinding(context, tool, 'No Required Parameters', 'The tool has properties but none are required. This can lead to ambiguous LLM invocations.', 'low'));
        }
      }

      // Check properties for unbounded strings
      if (schema.properties) {
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          const p = propDef as Record<string, unknown>;
          if (p.type === 'string') {
            if (!p.enum && !p.maxLength && !p.pattern) {
              findings.push(createFinding(
                context, 
                tool, 
                `Unbounded String Parameter: ${propName}`, 
                `Parameter '${propName}' is a string but lacks enum, maxLength, or pattern constraints. This increases the risk of injection or hallucinated payloads.`, 
                'medium'
              ));
            }
          }
        }
      }
    }

    return findings;
  },
};

function createFinding(
  context: EngineContext,
  tool: McpToolInfo,
  title: string,
  message: string,
  severity: Finding['severity']
): Finding {
  return {
    id: randomUUID(),
    projectId: context.projectId,
    runId: context.runId,
    engine: 'mcp',
    ruleId: SchemaRigorRule.id,
    category: SchemaRigorRule.category,
    severity,
    confidence: SchemaRigorRule.confidence,
    title,
    message,
    location: `Tool: ${tool.name}`,
    evidence: {
      toolName: tool.name,
      schema: tool.inputSchema,
    },
    remediation: 'Apply stricter JSON Schema constraints (e.g., properties, enum, maxLength).',
    timestamp: new Date().toISOString(),
  };
}
