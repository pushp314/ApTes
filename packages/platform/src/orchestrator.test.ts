import { describe, it, expect, vi } from "vitest";
import { runUnifiedPlatform } from "./orchestrator.js";

// Mock the engines to inject findings directly for the correlation test
vi.mock("@sentinel/web", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentinel/web")>();
  return {
    ...actual,
    runWebEngine: vi
      .fn()
      .mockImplementation(async (url, rules, projectId, options) => {
        if (
          url === "https://mock.correlation.test" ||
          url === "https://mock.tls.test"
        ) {
          return {
            findings: [
              {
                id: "web-1",
                projectId: "test",
                runId: "test",
                engine: "web",
                ruleId: "security-headers",
                category: "config",
                severity: "medium",
                confidence: "high",
                title: "Missing Security Headers",
                message: "HSTS and CSP missing",
                timestamp: "",
              },
            ],
            error: undefined,
          };
        }
        return actual.runWebEngine(url, rules, projectId, options);
      }),
  };
});

vi.mock("@sentinel/codesentinel", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@sentinel/codesentinel")>();
  return {
    ...actual,
    scan: vi.fn().mockImplementation(async (path) => {
      if (path === "/mock/path") {
        return {
          findings: [
            {
              id: "code-1",
              projectId: "test",
              runId: "test",
              engine: "code",
              ruleId: "missing-auth",
              category: "auth",
              severity: "high",
              confidence: "high",
              title: "Missing Auth",
              message: "",
              timestamp: "",
            },
          ],
          durationMs: 10,
        };
      }
      return actual.scan(path, actual.createConfig({}));
    }),
  };
});

vi.mock("@sentinel/recon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentinel/recon")>();
  return {
    ...actual,
    runReconEngine: vi.fn().mockImplementation(async (target) => {
      if (target === "mock.correlation.test") {
        return {
          findings: [
            {
              id: "recon-1",
              projectId: "test",
              runId: "test",
              engine: "recon",
              ruleId: "recon-nmap-port-80",
              category: "network",
              severity: "info",
              confidence: "high",
              title: "Open Port",
              message: "",
              timestamp: "",
              evidence: { service: "http" },
            },
          ],
          durationMs: 10,
        };
      }
      if (target === "mock.tls.test") {
        return {
          findings: [
            {
              id: "recon-tls-1",
              projectId: "test",
              runId: "test",
              engine: "recon",
              ruleId: "recon-testssl-SSLv2",
              category: "transport-security",
              severity: "critical",
              confidence: "high",
              title: "Insecure Legacy SSL Protocol Offered (SSLv2)",
              message: "offered (NOT ok)",
              timestamp: "",
            },
          ],
          durationMs: 10,
        };
      }
      if (target === "mock.subdomains.test") {
        return {
          findings: [
            {
              id: "recon-sub-1",
              projectId: "test",
              runId: "test",
              engine: "recon",
              ruleId: "recon-subdomain-discovered",
              category: "attack-surface",
              severity: "info",
              confidence: "high",
              title: "Discovered Subdomain: api.mock.subdomains.test",
              message: "",
              location: "api.mock.subdomains.test",
              timestamp: "",
              evidence: { host: "api.mock.subdomains.test" },
            },
          ],
          durationMs: 10,
        };
      }
      if (target === "mock.endpoint.test") {
        return {
          findings: [
            {
              id: "recon-ffuf-1",
              projectId: "test",
              runId: "test",
              engine: "recon",
              ruleId: "recon-ffuf-admin",
              category: "sensitive-exposure",
              severity: "high",
              confidence: "high",
              title:
                "Exposed Administrative / Sensitive Endpoint: https://mock.endpoint.test/admin",
              message: "Endpoint /admin returned HTTP 200",
              location: "https://mock.endpoint.test/admin",
              timestamp: "",
            },
          ],
          durationMs: 10,
        };
      }
      return { findings: [], durationMs: 10 };
    }),
  };
});

describe("Unified Platform Orchestrator (SSRF Protections)", () => {
  it("should reject local/private IPs when allowLocalTargets is omitted (defaults to false)", async () => {
    const report = await runUnifiedPlatform({
      id: "test-proj",
      webUrl: "http://127.0.0.1:8080",
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
    });

    expect(report.errors.length).toBeGreaterThan(0);
    const webError = report.errors.find((e) => e.includes("Web Engine Error"));
    expect(webError).toBeDefined();
    expect(webError).toContain("Targetting localhost");
  });
});

describe("Unified Platform Orchestrator (Authorization Gate)", () => {
  it("should refuse to scan when authorizationConfirmed is false", async () => {
    const report = await runUnifiedPlatform({
      id: "test-proj",
      webUrl: "https://example.com",
      authorizationConfirmed: false,
      mcpTargets: [],
    });

    expect(report.errors.length).toBe(1);
    expect(report.errors[0]).toContain(
      "explicit authorization confirmation with a valid timestamp is required",
    );
  });
});

describe("Unified Platform Orchestrator (Correlation Logic)", () => {
  it("should generate a platform correlation finding when all three criteria are met", async () => {
    const report = await runUnifiedPlatform({
      id: "test-proj",
      webUrl: "https://mock.correlation.test",
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
      reconTargets: [
        {
          target: "mock.correlation.test",
          authorizationConfirmed: true,
          authorizationConfirmedAt: new Date().toISOString(),
        },
      ],
      codePath: "/mock/path",
    });

    // We expect 3 individual engine findings + 1 correlation finding
    const correlationFindings = report.findings.filter(
      (f) => f.ruleId === "platform-exposed-service-no-auth",
    );
    expect(correlationFindings.length).toBe(1);

    const finding = correlationFindings[0];
    if (!finding) throw new Error("Missing correlation finding");

    expect(finding.severity).toBe("critical");
    expect(finding.engine).toBe("platform");

    // Check that evidence holds references to the original findings
    const evidence: any = finding.evidence;
    expect(evidence.nmapFinding).toBe("recon-1");
    expect(evidence.webFinding).toBe("web-1");
    expect(evidence.codeFinding).toBe("code-1");
  });

  it("should generate platform-tls-and-header-drift finding when testssl and web security headers collide", async () => {
    const report = await runUnifiedPlatform({
      id: "test-tls-proj",
      webUrl: "https://mock.tls.test",
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
      reconTargets: [
        {
          target: "mock.tls.test",
          authorizationConfirmed: true,
          authorizationConfirmedAt: new Date().toISOString(),
        },
      ],
    });

    const driftFindings = report.findings.filter(
      (f) => f.ruleId === "platform-tls-and-header-drift",
    );
    expect(driftFindings.length).toBe(1);
    const drift = driftFindings[0];
    if (!drift) throw new Error("Missing drift finding");
    expect(drift.severity).toBe("high");
    expect(drift.title).toContain(
      "Transport Layer & Header Security Weakness Drift",
    );
  });

  it("should generate platform-recon-discovered-attack-surface finding when subdomains are discovered outside declared scope", async () => {
    const report = await runUnifiedPlatform({
      id: "test-sub-proj",
      webUrl: "https://primary.example.com",
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
      reconTargets: [
        {
          target: "mock.subdomains.test",
          authorizationConfirmed: true,
          authorizationConfirmedAt: new Date().toISOString(),
        },
      ],
    });

    const attackSurfaceFindings = report.findings.filter(
      (f) => f.ruleId === "platform-recon-discovered-attack-surface",
    );
    expect(attackSurfaceFindings.length).toBe(1);
    const attack = attackSurfaceFindings[0];
    if (!attack) throw new Error("Missing attack surface finding");
    expect(attack.severity).toBe("info");
    expect(attack.title).toContain("Unmapped Attack Surface Discovered");
    expect((attack.evidence as any).discoveredHosts).toContain(
      "api.mock.subdomains.test",
    );
  });

  it("should generate platform-unmapped-sensitive-endpoint finding when active recon discovers sensitive endpoints", async () => {
    const report = await runUnifiedPlatform({
      id: "test-endpoint-proj",
      webUrl: "https://mock.endpoint.test",
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
      reconTargets: [
        {
          target: "mock.endpoint.test",
          authorizationConfirmed: true,
          authorizationConfirmedAt: new Date().toISOString(),
        },
      ],
    });

    const endpointFindings = report.findings.filter(
      (f) => f.ruleId === "platform-unmapped-sensitive-endpoint",
    );
    expect(endpointFindings.length).toBe(1);
    const finding = endpointFindings[0];
    if (!finding) throw new Error("Missing endpoint finding");
    expect(finding.severity).toBe("high");
    expect(finding.title).toContain("Correlated Exposed Sensitive Endpoint");
    expect((finding.evidence as any).reconFindingId).toBe("recon-ffuf-1");
  });
});
