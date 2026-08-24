import { runWebEngine, ConsoleErrorsRule, FailedRequestsRule, FormsRule, PageStructureRule, PerformanceRule, SecurityHeadersRule, CookieSecurityRule, MixedContentRule, AiWidgetRule, ActiveFuzzRule } from '@sentinel/web';
import { runMcpEngine, ToolCountRule, SchemaRigorRule, PrivilegeAnalysisRule, TransportSecurityRule, CveMatchingRule } from '@sentinel/mcp';
import { scan as runCodeEngine, createConfig as createCodeConfig } from '@sentinel/codesentinel';
import type { Finding, AuditChapter } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';
import { probeRouteAccessControls } from './pentest/auth-audit.js';

import { AiReviewer } from './ai-reviewer.js';

export interface McpTarget {
  /** Stable name used for explicit Web ↔ MCP correlation. */
  name?: string;
  command: string;
  args: string[];
  /** Authorization is per MCP target; it is never inherited from the project. */
  authorizationConfirmed: boolean;
  authorizationConfirmedAt: string;
}

export interface ProjectDefinition {
  id: string;
  webUrl: string;
  mcpTargets: McpTarget[];
  codePath?: string;
  /** Glob patterns of files/directories the Code Engine must skip (e.g. "fixtures/**"). */
  excludePatterns?: string[];
  /** Suppress ts-type-error diagnostics for JS-only codebases. */
  skipTypeErrors?: boolean;
  /** Enable active pentesting & access control probes against web target. */
  activePentestMode?: boolean;
  /** Explicit attestation that the operator may scan this web target. */
  authorizationConfirmed: boolean;
  /** ISO-8601 timestamp at which the web-target attestation was made. */
  authorizationConfirmedAt?: string;
  /** Local/private targets are blocked unless this testing-only opt-in is set. */
  allowLocalTargets?: boolean;
  aiEnabled?: boolean;
  aiBudget?: number;
  aiModel?: string;
  aiUrl?: string;
  aiProvider?: string;
}

function hasValidAuthorization(confirmed: boolean, confirmedAt?: string): boolean {
  return confirmed && typeof confirmedAt === 'string' && !Number.isNaN(Date.parse(confirmedAt));
}

/**
 * Enforce authorization before either live-target engine is started. Keeping
 * this at the orchestration boundary prevents a UI or CLI from bypassing it.
 */
function getProjectAuthorizationError(project: ProjectDefinition): string | undefined {
  if (!hasValidAuthorization(project.authorizationConfirmed, project.authorizationConfirmedAt)) {
    return 'Web scan refused: explicit authorization confirmation with a valid timestamp is required.';
  }

  for (const target of project.mcpTargets) {
    if (!hasValidAuthorization(target.authorizationConfirmed, target.authorizationConfirmedAt)) {
      const name = target.name ?? target.command;
      return `MCP scan refused for '${name}': explicit per-target authorization confirmation with a valid timestamp is required.`;
    }
  }

  return undefined;
}

export interface UnifiedReport {
  projectId: string;
  durationMs: number;
  overallScore: number;
  findings: Finding[];
  errors: string[];
  /** Optional AI-generated thematic chapters (advisory, never deterministic data). */
  chapters?: AuditChapter[];
}

export async function runUnifiedPlatform(project: ProjectDefinition, timeoutMs: number = 30000, onProgress?: (msg: string) => void): Promise<UnifiedReport> {
  const startTime = Date.now();
  const authorizationError = getProjectAuthorizationError(project);
  if (authorizationError) {
    return {
      projectId: project.id,
      durationMs: Date.now() - startTime,
      overallScore: 100,
      findings: [],
      errors: [authorizationError],
    };
  }

  const errors: string[] = [];
  let allFindings: Finding[] = [];
  
  const aiReviewer = new AiReviewer({ 
    enabled: project.aiEnabled ?? false,
    budget: project.aiBudget,
    model: project.aiModel,
    url: project.aiUrl,
    provider: project.aiProvider as 'ollama' | 'mock' | 'gemini',
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
    AiWidgetRule,
    ActiveFuzzRule
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
    onProgress?.(`Starting Web Engine scan for target: ${project.webUrl}`);
    const webResult = await runWebEngine(project.webUrl, webRules, project.id, {
      scanTimeoutMs: timeoutMs,
      allowLocal: project.allowLocalTargets ?? false,
      authorizationConfirmed: project.authorizationConfirmed,
      authorizationConfirmedAt: project.authorizationConfirmedAt,
      onProgress: onProgress,
    });
    if (webResult.error) {
      errors.push(`Web Engine Error: ${webResult.error}`);
    } else {
      allFindings = allFindings.concat(webResult.findings);
    }

    // 2. Run MCP Engine (for each configured target)
    if (project.mcpTargets.length > 0) {
      onProgress?.(`Starting MCP Engine checks across ${project.mcpTargets.length} targets`);
    }
    for (const target of project.mcpTargets) {
      onProgress?.(`Testing MCP target: ${target.command}`);
      const mcpResult = await runMcpEngine(mcpRules, project.id, {
        command: target.command,
        args: target.args,
        scanTimeoutMs: timeoutMs,
        authorizationConfirmed: target.authorizationConfirmed,
        authorizationConfirmedAt: target.authorizationConfirmedAt,
      });
      if (mcpResult.error) {
        errors.push(`MCP Engine Error (${target.command}): ${mcpResult.error}`);
      } else {
        // Tag MCP findings with the target command so they can be correlated precisely
        const targetString = `${target.command} ${target.args.join(' ')}`;
        const targetName = target.name ?? targetString;
        const taggedFindings = mcpResult.findings.map(f => ({
          ...f,
          evidence: {
            ...f.evidence,
            mcpTargetCommand: targetString,
            mcpTargetName: targetName,
          }
        }));
        allFindings = allFindings.concat(taggedFindings);
      }
    }

    // 2.5 Run Code Engine
    if (project.codePath) {
      onProgress?.(`Starting Static Source Code Engine analysis for directory: ${project.codePath}`);
      try {
        const codeResult = await runCodeEngine(project.codePath, createCodeConfig({
          maxFiles: 1000,
          useCache: false,
          excludePatterns: project.excludePatterns ?? [],
          skipTypeErrors: project.skipTypeErrors ?? false
        }));
        allFindings = allFindings.concat(codeResult.findings);

        // Active Access Control Verification: If active pentest mode is enabled (or webUrl is live),
        // probe discovered sensitive routes for real unauthenticated access.
        if (project.activePentestMode && project.webUrl) {
          const authFindings = codeResult.findings.filter(f => f.ruleId === 'missing-auth' && f.evidence?.route);
          const targets = authFindings.map(f => ({
            route: String(f.evidence.route),
            isSensitive: true
          }));

          if (targets.length > 0) {
            const probedFindings = await probeRouteAccessControls(targets, { baseUrl: project.webUrl }, project.id);
            allFindings = allFindings.concat(probedFindings);
          }
        }
      } catch (err) {
        errors.push(`Code Engine Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Correlation Logic
    // We look for Web Engine findings indicating an AI Widget (category: 'ai-widget')
    // We look for MCP Engine findings that are high/critical
    const webWidgets = allFindings.filter(f => f.engine === 'web' && f.category === 'ai-widget');
    const mcpVulnerabilities = allFindings.filter(f => f.engine === 'mcp' && (f.severity === 'high' || f.severity === 'critical'));

    for (const widget of webWidgets) {
      const connectedTarget = widget.evidence?.targetName as string | undefined;
      if (!connectedTarget) continue;
      
      // Only correlate if the MCP vulnerability actually came from the connected target
      const specificMcpVulnerabilities = mcpVulnerabilities.filter(
        v => v.evidence?.mcpTargetName === connectedTarget
      );

      if (specificMcpVulnerabilities.length > 0) {
        allFindings.push({
          id: randomUUID(),
          projectId: project.id,
          runId: widget.runId,
          engine: 'web', // Associated with the web app since it's the frontend exposing it
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

      // 3-Way Correlation: P0 Attack Path
      // Phase 17: Exact Path Correlation
      // 1. Web Widget makes network request to an API route (interceptedApiRoutes)
      // 2. CodeSentinel flags that exact API route as missing-auth
      // 3. CodeSentinel flags that exact API route as exposing an MCP client
      // 4. MCPSentinel flags that connected MCP client has critical vulnerabilities
      
      const interceptedRoutes = widget.evidence?.interceptedApiRoutes as string[] | undefined;
      if (interceptedRoutes && specificMcpVulnerabilities.length > 0) {
        for (const route of interceptedRoutes) {
          // Does CodeSentinel know about this route?
          const missingAuthFinding = allFindings.find(f => 
            f.engine === 'code' && f.ruleId === 'missing-auth' && f.evidence?.route === route
          );
          
          const mcpExposureFinding = allFindings.find(f => 
            f.engine === 'code' && f.ruleId === 'mcp-exposure' && f.evidence?.route === route
          );

          if (missingAuthFinding && mcpExposureFinding) {
            allFindings.push({
              id: randomUUID(),
              projectId: project.id,
              runId: widget.runId,
              engine: 'platform',
              ruleId: 'platform-p0-attack-path',
              category: 'correlation',
              severity: 'critical',
              confidence: 'high',
              title: 'P0 Attack Path: Unauthenticated Backend Route Exposes Vulnerable MCP Tool to Frontend',
              message: `A complete risk path was detected: Frontend AI widget connects to backend route '${route}'. This route lacks authentication and exposes an MCP target with critical/high vulnerabilities.`,
              location: 'Cross-Engine Context',
              evidence: {
                webFindingId: widget.id,
                codeFindingIds: [missingAuthFinding.id, mcpExposureFinding.id],
                mcpFindingIds: specificMcpVulnerabilities.map(v => v.id),
                verifiedRoute: route
              },
              remediation: `Apply authentication to backend route '${route}' and secure MCP tools immediately.`,
              timestamp: new Date().toISOString(),
            });
            break; // Stop at first exact path match for this widget
          }
        }
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
