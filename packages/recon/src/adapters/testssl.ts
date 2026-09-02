import { randomUUID } from "node:crypto";
import type { Finding } from "@sentinel/shared";
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from "../adapter.js";

interface TestsslItem {
  id: string;
  ip?: string;
  finding?: string;
  severity?: string;
  cwe?: string;
  cve?: string;
}

export const TestsslAdapter: ToolAdapter = {
  id: "testssl",
  name: "testssl.sh",

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync("testssl.sh", ["-v"]);
      return true;
    } catch {
      return false;
    }
  },

  async run(target: string, options: ToolRunOptions): Promise<RawToolOutput> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const start = Date.now();
    try {
      const args = ["--jsonfile-pretty", "-", "--fast", target];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const { stdout, stderr } = await execFileAsync("testssl.sh", args, {
        timeout: options.timeoutMs,
      });
      return {
        stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        stdout: e.stdout || "",
        stderr: e.stderr || e.message,
        exitCode: e.code || 1,
        durationMs: Date.now() - start,
      };
    }
  },

  parse(raw: RawToolOutput, projectId: string, runId: string): Finding[] {
    const findings: Finding[] = [];
    if (!raw.stdout) return findings;

    let items: TestsslItem[] = [];
    try {
      // testssl.sh output may include warning banners before the JSON array, so find the JSON start
      const jsonStart = raw.stdout.indexOf("[");
      const jsonEnd = raw.stdout.lastIndexOf("]");
      if (jsonStart === -1 || jsonEnd === -1) {
        return findings;
      }
      items = JSON.parse(raw.stdout.slice(jsonStart, jsonEnd + 1));
    } catch {
      return findings;
    }

    if (!Array.isArray(items)) return findings;

    for (const item of items) {
      if (!item.id || !item.severity) continue;

      const sev = item.severity.toUpperCase();
      // Skip informational or OK items
      if (sev === "OK" || sev === "INFO" || sev === "DEBUG") continue;

      let severity: Finding["severity"] = "low";
      if (sev === "CRITICAL") severity = "critical";
      else if (sev === "HIGH") severity = "high";
      else if (sev === "MEDIUM" || sev === "WARN") severity = "medium";

      // Title mapping based on check ID
      let title = `TLS Configuration Weakness: ${item.id}`;
      if (item.id.includes("cert_expiration")) {
        title = "SSL/TLS Certificate Expired or Expiring";
      } else if (item.id === "SSLv2" || item.id === "SSLv3") {
        title = `Insecure Legacy SSL Protocol Offered (${item.id})`;
        severity = "critical";
      } else if (item.id === "TLS1" || item.id === "TLS1_1") {
        title = `Deprecated TLS Protocol Offered (${item.id})`;
        severity = "medium";
      } else if (item.id === "HSTS_time" || item.id.includes("HSTS")) {
        title = "Missing or Weak HTTP Strict Transport Security (HSTS)";
        severity = "medium";
      } else if (item.id.toLowerCase().includes("heartbleed")) {
        title = "OpenSSL Heartbleed Vulnerability Detected";
        severity = "critical";
      }

      findings.push({
        id: randomUUID(),
        projectId,
        runId,
        engine: "recon",
        ruleId: `recon-testssl-${item.id}`,
        category: "transport-security",
        severity,
        confidence: "high",
        title,
        message:
          item.finding || `testssl.sh detected issue with check ${item.id}`,
        location: item.ip,
        evidence: {
          testsslId: item.id,
          finding: item.finding,
          cve: item.cve,
          cwe: item.cwe,
        },
        remediation:
          "Upgrade TLS server configuration to enforce TLS 1.2+ with modern cipher suites and valid HSTS.",
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
