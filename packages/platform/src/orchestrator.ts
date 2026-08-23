import { runWebEngine, ConsoleErrorsRule, FailedRequestsRule, FormsRule, PageStructureRule, PerformanceRule, SecurityHeadersRule, CookieSecurityRule, MixedContentRule, AiWidgetRule } from '@sentinel/web';
import { runMcpEngine, ToolCountRule, SchemaRigorRule, PrivilegeAnalysisRule, TransportSecurityRule, CveMatchingRule } from '@sentinel/mcp';
import type { Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

import { AiReviewer } from './ai-reviewer.js';

export interface McpTarget {
  command: string;
  args: string[];
}

export interface ProjectDefinition {
  id: string;
  webUrl: string;
  mcpTargets: McpTarget[];
  aiEnabled?: boolean;
  aiBudget?: number;
  aiModel?: string;
  aiUrl?: string;
}

export interface UnifiedReport {
  projectId: string;
  durationMs: number;
  overallScore: number;
  findings: Finding[];
  errors: string[];
}

export async function runUnifiedPlatform(project: ProjectDefinition, timeoutMs: number = 30000): Promise<UnifiedReport> {
  const startTime = Date.now();
  const errors: string[] = [];
  let allFindings: Finding[] = [];
  
  const aiReviewer = new AiReviewer({ 
    enabled: project.aiEnabled ?? false,
    budget: project.aiBudget,
    model: project.aiModel,
    url: project.aiUrl,
    projectId: project.id
  });

  const webRules = [
    ConsoleErrorsRule,
    FailedRequestsRule,
    FormsRule,
    PageStructureRule,
    PerformanceRule,
    SecurityHeadersRule,
    CookieSecurityRule,
    MixedContentRule,
    AiWidgetRule
  ];

  const mcpRules = [
    ToolCountRule,
    SchemaRigorRule,
    PrivilegeAnalysisRule,
    TransportSecurityRule,
    CveMatchingRule
  ];

  try {
    // 1. Run Web Engine
    const webResult = await runWebEngine(project.webUrl, webRules, project.id, { scanTimeoutMs: timeoutMs, allowLocal: true });
    if (webResult.error) {
      errors.push(`Web Engine Error: ${webResult.error}`);
    } else {
      allFindings = allFindings.concat(webResult.findings);
    }

    // 2. Run MCP Engine (for each configured target)
    for (const target of project.mcpTargets) {
      const mcpResult = await runMcpEngine(mcpRules, project.id, {
        command: target.command,
        args: target.args,
        scanTimeoutMs: timeoutMs
      });
      if (mcpResult.error) {
        errors.push(`MCP Engine Error (${target.command}): ${mcpResult.error}`);
      } else {
        // Tag MCP findings with the target command so they can be correlated precisely
        const targetString = `${target.command} ${target.args.join(' ')}`;
        const taggedFindings = mcpResult.findings.map(f => ({
          ...f,
          evidence: {
            ...f.evidence,
            mcpTargetCommand: targetString
          }
        }));
        allFindings = allFindings.concat(taggedFindings);
      }
    }

    // 3. Correlation Logic
    // We look for Web Engine findings indicating an AI Widget (category: 'ai-widget')
    // We look for MCP Engine findings that are high/critical
    const webWidgets = allFindings.filter(f => f.engine === 'web' && f.category === 'ai-widget');
    const mcpVulnerabilities = allFindings.filter(f => f.engine === 'mcp' && (f.severity === 'high' || f.severity === 'critical'));

    for (const widget of webWidgets) {
      const connectedTarget = widget.evidence?.targetName as string || 'unknown-target';
      
      // Only correlate if the MCP vulnerability actually came from the connected target
      const specificMcpVulnerabilities = mcpVulnerabilities.filter(
        v => typeof v.evidence?.mcpTargetCommand === 'string' && 
             v.evidence.mcpTargetCommand.includes(connectedTarget)
      );

      if (specificMcpVulnerabilities.length > 0) {
        allFindings.push({
          id: randomUUID(),
          projectId: project.id,
          runId: widget.runId,
          engine: 'platform', // Platform-level correlated finding
          ruleId: 'platform-mcp-exposure',
          category: 'correlation',
          severity: 'critical',
          confidence: 'high',
          title: 'Critically Vulnerable AI Agent Exposed on Frontend',
          message: `The web frontend exposes an AI chat widget/component (connected to '${connectedTarget}') while the connected backend MCP server has ${specificMcpVulnerabilities.length} critical/high vulnerabilities.`,
          location: widget.location,
          evidence: {
            webFindingId: widget.id,
            mcpFindingIds: specificMcpVulnerabilities.map(v => v.id),
          },
          remediation: 'Address the underlying MCP vulnerabilities immediately or disconnect the agent from the frontend.',
          timestamp: new Date().toISOString(),
        });
      }
    }

  } catch (err) {
    errors.push(`Platform orchestration failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. AI Assistance (Optional, off by default)
  // AI only reviews low-confidence findings as per project rules.
  allFindings = await aiReviewer.review(allFindings);

  // Very naive overall score for MVP
  const criticals = allFindings.filter(f => f.severity === 'critical').length;
  const highs = allFindings.filter(f => f.severity === 'high').length;
  let score = 100 - (criticals * 20) - (highs * 10);
  if (score < 0) score = 0;

  return {
    projectId: project.id,
    durationMs: Date.now() - startTime,
    overallScore: score,
    findings: allFindings,
    errors
  };
}
