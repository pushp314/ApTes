import { randomUUID } from "node:crypto";
import type { Finding } from "@sentinel/shared";
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from "../adapter.js";

interface SubfinderEntry {
  host: string;
  ip?: string;
  sources?: string[];
}

export const SubfinderAdapter: ToolAdapter = {
  id: "subfinder",
  name: "Subfinder",

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync("subfinder", ["-version"]);
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
      const args = ["-d", target, "-json"];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const { stdout, stderr } = await execFileAsync("subfinder", args, {
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

    const lines = raw.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      try {
        const item: SubfinderEntry = JSON.parse(line);
        if (!item.host) continue;

        const sources = Array.isArray(item.sources)
          ? item.sources.join(", ")
          : "passive dns";

        findings.push({
          id: randomUUID(),
          projectId,
          runId,
          engine: "recon",
          ruleId: "recon-subdomain-discovered",
          category: "attack-surface",
          severity: "info",
          confidence: "high",
          title: `Discovered Subdomain: ${item.host}`,
          message: `Passive reconnaissance discovered subdomain ${item.host} (sources: ${sources}).`,
          location: item.host,
          evidence: {
            host: item.host,
            ip: item.ip,
            sources: item.sources ?? [],
          },
          remediation:
            "Verify whether this subdomain is intentional, properly secured, and within authorized testing scope.",
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Plain text hostname fallback if output isn't JSON-lines
        if (line.includes(".") && !line.includes("{") && !line.includes(" ")) {
          findings.push({
            id: randomUUID(),
            projectId,
            runId,
            engine: "recon",
            ruleId: "recon-subdomain-discovered",
            category: "attack-surface",
            severity: "info",
            confidence: "high",
            title: `Discovered Subdomain: ${line}`,
            message: `Reconnaissance discovered subdomain ${line}.`,
            location: line,
            evidence: { host: line },
            remediation:
              "Verify whether this subdomain is intentional, properly secured, and within authorized testing scope.",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};
