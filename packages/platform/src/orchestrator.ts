import {
  runWebEngine,
  ConsoleErrorsRule,
  FailedRequestsRule,
  FormsRule,
  PageStructureRule,
  PerformanceRule,
  SecurityHeadersRule,
  CookieSecurityRule,
  MixedContentRule,
  AiWidgetRule,
  ActiveFuzzRule,
} from "@sentinel/web";
import {
  scan as runCodeEngine,
  createConfig as createCodeConfig,
} from "@sentinel/codesentinel";
import { runReconEngine } from "@sentinel/recon";
import type { Finding, AuditChapter } from "@sentinel/shared";
import { probeRouteAccessControls } from "./pentest/auth-audit.js";
import * as crypto from "node:crypto";

import { AiReviewer } from "./ai-reviewer.js";

export interface McpTarget {
  /** Stable name used for explicit Web ↔ MCP correlation. */
  name?: string;
  command: string;
  args: string[];
  /** Authorization is per MCP target; it is never inherited from the project. */
  authorizationConfirmed: boolean;
  authorizationConfirmedAt: string;
}

export interface ReconTarget {
  name?: string;
  target: string;
  authorizationConfirmed: boolean;
  authorizationConfirmedAt: string;
  adapters?: string[];
}

export interface ProjectDefinition {
  id: string;
  webUrl: string;
  mcpEnabled?: boolean;
  mcpTargets: McpTarget[];
  reconTargets?: ReconTarget[];
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

function hasValidAuthorization(
  confirmed: boolean,
  confirmedAt?: string,
): boolean {
  return (
    confirmed &&
    typeof confirmedAt === "string" &&
    !Number.isNaN(Date.parse(confirmedAt))
  );
}

/**
 * Enforce authorization before either live-target engine is started. Keeping
 * this at the orchestration boundary prevents a UI or CLI from bypassing it.
 */
function getProjectAuthorizationError(
  project: ProjectDefinition,
): string | undefined {
  if (
    !hasValidAuthorization(
      project.authorizationConfirmed,
      project.authorizationConfirmedAt,
    )
  ) {
    return "Web scan refused: explicit authorization confirmation with a valid timestamp is required.";
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

export async function runUnifiedPlatform(
  project: ProjectDefinition,
  timeoutMs: number = 30000,
  onProgress?: (msg: string) => void,
): Promise<UnifiedReport> {
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
    provider: project.aiProvider as "ollama" | "mock" | "gemini",
    projectId: project.id,
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
    ActiveFuzzRule,
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

    // 2.5 Run Code Engine
    if (project.codePath) {
      onProgress?.(
        `Starting Static Source Code Engine analysis for directory: ${project.codePath}`,
      );
      try {
        const codeResult = await runCodeEngine(
          project.codePath,
          createCodeConfig({
            maxFiles: 1000,
            useCache: false,
            excludePatterns: project.excludePatterns ?? [],
            skipTypeErrors: project.skipTypeErrors ?? false,
          }),
        );
        allFindings = allFindings.concat(codeResult.findings);

        // Active Access Control Verification: If active pentest mode is enabled (or webUrl is live),
        // probe discovered sensitive routes for real unauthenticated access.
        if (project.activePentestMode && project.webUrl) {
          const authFindings = codeResult.findings.filter(
            (f) => f.ruleId === "missing-auth" && f.evidence?.route,
          );
          const targets = authFindings.map((f) => ({
            route: String(f.evidence.route),
            isSensitive: true,
          }));

          if (targets.length > 0) {
            const probedFindings = await probeRouteAccessControls(
              targets,
              { baseUrl: project.webUrl },
              project.id,
            );
            allFindings = allFindings.concat(probedFindings);
          }
        }
      } catch (err) {
        errors.push(
          `Code Engine Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 3. Run Recon Engine
    if (project.reconTargets && project.reconTargets.length > 0) {
      for (const rt of project.reconTargets) {
        if (
          !hasValidAuthorization(
            rt.authorizationConfirmed,
            rt.authorizationConfirmedAt,
          )
        ) {
          errors.push(
            `Recon Error: Target ${rt.target} lacks valid authorization confirmation. Skipping.`,
          );
          continue;
        }

        onProgress?.(`Starting Recon Engine analysis for target: ${rt.target}`);
        try {
          const reconResult = await runReconEngine(
            rt.target,
            project.id,
            project.id,
            {
              adapters: rt.adapters || [
                "nuclei",
                "nmap",
                "testssl",
                "subfinder",
                "theharvester",
              ],
              scanTimeoutMs: timeoutMs,
              onProgress,
            },
          );
          if (reconResult.error) {
            errors.push(
              `Recon Engine Warning for ${rt.target}: ${reconResult.error}`,
            );
          }
          allFindings = allFindings.concat(reconResult.findings);
        } catch (err) {
          errors.push(
            `Recon Engine Error for ${rt.target}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    // 4. Correlation Logic
    // 4a. Correlate: Nmap open HTTP port + Web missing headers + Code missing auth -> platform-exposed-service-no-auth
    const nmapHttpFindings = allFindings.filter(
      (f) =>
        f.engine === "recon" &&
        f.ruleId.startsWith("recon-nmap-port-") &&
        (f.evidence as any)?.service === "http",
    );
    const missingHeadersFindings = allFindings.filter(
      (f) => f.engine === "web" && f.ruleId === "security-headers",
    );
    const codeMissingAuthFindings = allFindings.filter(
      (f) => f.engine === "code" && f.ruleId === "missing-auth",
    );

    const nmapFinding = nmapHttpFindings[0];
    const missingHeadersFinding = missingHeadersFindings[0];
    const codeMissingAuthFinding = codeMissingAuthFindings[0];

    if (nmapFinding && missingHeadersFinding && codeMissingAuthFinding) {
      allFindings.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        runId: project.id,
        engine: "platform",
        ruleId: "platform-exposed-service-no-auth",
        category: "correlation",
        severity: "critical",
        confidence: "high",
        title: "Critically Exposed Unauthenticated Service",
        message:
          "Correlation detected an open HTTP port (Recon) on a service lacking security headers (Web) with known missing authentication controls (Code). This indicates a fully exposed, unauthenticated API.",
        evidence: {
          nmapFinding: nmapFinding.id,
          webFinding: missingHeadersFinding.id,
          codeFinding: codeMissingAuthFinding.id,
        },
        remediation:
          "Implement robust authentication on the exposed endpoints and enforce network-level access controls immediately.",
        timestamp: new Date().toISOString(),
      });
    }

    // 4b. Correlate: Recon testssl transport issues + Web missing security headers -> platform-tls-and-header-drift
    const testsslFindings = allFindings.filter(
      (f) => f.engine === "recon" && f.ruleId.startsWith("recon-testssl-"),
    );
    if (testsslFindings.length > 0 && missingHeadersFinding) {
      const criticalTls = testsslFindings.find(
        (f) => f.severity === "critical" || f.severity === "high",
      );
      allFindings.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        runId: project.id,
        engine: "platform",
        ruleId: "platform-tls-and-header-drift",
        category: "correlation",
        severity: criticalTls ? "high" : "medium",
        confidence: "high",
        title: "Transport Layer & Header Security Weakness Drift",
        message: `Reconnaissance detected TLS weaknesses (${testsslFindings.map((f) => f.title).join(", ")}) combined with missing HTTP application security headers (${missingHeadersFinding.message}). Both transport encryption and client-side header policies are degraded.`,
        evidence: {
          testsslFindingIds: testsslFindings.map((f) => f.id),
          webFindingId: missingHeadersFinding.id,
        },
        remediation:
          "Simultaneously harden TLS cipher suites on the load balancer/reverse proxy and configure strict HTTP security headers (HSTS, CSP, X-Frame-Options).",
        timestamp: new Date().toISOString(),
      });
    }

    // 4c. Correlate: Subdomains discovered outside of known primary webUrl -> platform-recon-discovered-attack-surface
    const discoveredSubdomainFindings = allFindings.filter(
      (f) =>
        f.engine === "recon" &&
        (f.ruleId === "recon-subdomain-discovered" ||
          f.ruleId === "recon-osint-host-discovered"),
    );
    const declaredHost = project.webUrl
      ? (() => {
          try {
            return new URL(project.webUrl).hostname;
          } catch {
            return "";
          }
        })()
      : "";

    const untrackedSubdomains = discoveredSubdomainFindings.filter((f) => {
      const loc = f.location || (f.evidence as any)?.host;
      return loc && loc !== declaredHost && !loc.startsWith("localhost");
    });

    if (untrackedSubdomains.length > 0) {
      const hosts = Array.from(
        new Set(
          untrackedSubdomains.map(
            (f) => f.location || (f.evidence as any)?.host,
          ),
        ),
      );
      allFindings.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        runId: project.id,
        engine: "platform",
        ruleId: "platform-recon-discovered-attack-surface",
        category: "correlation",
        severity: "info",
        confidence: "high",
        title: `Unmapped Attack Surface Discovered (${hosts.length} subdomains)`,
        message: `Reconnaissance identified subdomains not declared in primary project scope: ${hosts.slice(0, 5).join(", ")}${hosts.length > 5 ? "..." : ""}.`,
        evidence: {
          discoveredHosts: hosts,
          declaredScope: declaredHost,
        },
        remediation:
          "Review discovered subdomains, verify authorization, and add to project scan inventory if active.",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    errors.push(
      `Platform orchestration failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 4. AI Assistance (Optional, off by default)
  // AI only reviews low-confidence findings as per project rules.
  allFindings = await aiReviewer.review(allFindings);

  // Very naive overall score for MVP
  const criticals = allFindings.filter((f) => f.severity === "critical").length;
  const highs = allFindings.filter((f) => f.severity === "high").length;
  let score = 100 - criticals * 20 - highs * 10;
  if (score < 0) score = 0;

  return {
    projectId: project.id,
    durationMs: Date.now() - startTime,
    overallScore: score,
    findings: allFindings,
    errors,
  };
}
