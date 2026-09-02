import { randomUUID } from "node:crypto";
import type { Finding } from "@sentinel/shared";
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from "../adapter.js";

interface TheHarvesterOutput {
  emails?: string[];
  hosts?: string[];
  asns?: string[];
  shodan?: string[];
}

export const TheHarvesterAdapter: ToolAdapter = {
  id: "theharvester",
  name: "theHarvester",

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync("theHarvester", ["-h"]);
      return true;
    } catch {
      try {
        await execFileAsync("theharvester", ["-h"]);
        return true;
      } catch {
        return false;
      }
    }
  },

  async run(target: string, options: ToolRunOptions): Promise<RawToolOutput> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const execFileAsync = promisify(execFile);
    const start = Date.now();

    const tmpFile = path.join(tmpdir(), `theharvester-${Date.now()}`);
    try {
      const args = ["-d", target, "-b", "all", "-f", tmpFile];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const bin = (await this.checkAvailable())
        ? "theHarvester"
        : "theharvester";
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout: options.timeoutMs,
      });

      let fileJson = "";
      try {
        fileJson = await fs.readFile(`${tmpFile}.json`, "utf-8");
        await fs.unlink(`${tmpFile}.json`).catch(() => {});
      } catch {
        // Fallback to stdout if file was not created
      }

      return {
        stdout: fileJson || stdout,
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

    let parsed: TheHarvesterOutput;
    try {
      const jsonStart = raw.stdout.indexOf("{");
      const jsonEnd = raw.stdout.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return findings;
      parsed = JSON.parse(raw.stdout.slice(jsonStart, jsonEnd + 1));
    } catch {
      return findings;
    }

    // 1. Process leaked emails
    if (Array.isArray(parsed.emails) && parsed.emails.length > 0) {
      const uniqueEmails = Array.from(new Set(parsed.emails));
      findings.push({
        id: randomUUID(),
        projectId,
        runId,
        engine: "recon",
        ruleId: "recon-osint-email-leak",
        category: "osint-leakage",
        severity: "low",
        confidence: "high",
        title: `Exposed Corporate Email Addresses (${uniqueEmails.length} found)`,
        message: `Public OSINT sources revealed ${uniqueEmails.length} corporate email addresses associated with the domain. Sample: ${uniqueEmails.slice(0, 3).join(", ")}.`,
        evidence: {
          emails: uniqueEmails,
          totalCount: uniqueEmails.length,
        },
        remediation:
          "Ensure corporate email addresses are not exposed in public repositories or breach dumps, and enforce multi-factor authentication (MFA).",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Process discovered hosts
    if (Array.isArray(parsed.hosts) && parsed.hosts.length > 0) {
      for (const hostEntry of parsed.hosts) {
        const [host, ip] = hostEntry.split(":");
        if (!host) continue;

        findings.push({
          id: randomUUID(),
          projectId,
          runId,
          engine: "recon",
          ruleId: "recon-osint-host-discovered",
          category: "attack-surface",
          severity: "info",
          confidence: "high",
          title: `OSINT Discovered Host: ${host}`,
          message: `Public OSINT sources indexed active host ${host}${ip ? ` (IP: ${ip})` : ""}.`,
          location: host,
          evidence: { host, ip },
          remediation:
            "Confirm this host is inventory-tracked and adheres to organizational security baselines.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
