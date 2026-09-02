import { randomUUID } from "node:crypto";
import type { Finding } from "@sentinel/shared";
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from "../adapter.js";

interface NiktoVuln {
  id?: string;
  OSVDB?: string;
  method?: string;
  url?: string;
  uri?: string;
  msg?: string;
  message?: string;
}

interface NiktoOutput {
  host?: string;
  ip?: string;
  port?: string;
  banner?: string;
  vulnerabilities?: NiktoVuln[];
}

export const NiktoAdapter: ToolAdapter = {
  id: "nikto",
  name: "Nikto",

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync("nikto", ["-Version"]);
      return true;
    } catch {
      return false;
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

    const tmpFile = path.join(tmpdir(), `nikto-${Date.now()}.json`);
    try {
      const args = ["-h", target, "-Format", "json", "-o", tmpFile];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const { stdout, stderr } = await execFileAsync("nikto", args, {
        timeout: options.timeoutMs,
      });

      let fileJson = "";
      try {
        fileJson = await fs.readFile(tmpFile, "utf-8");
        await fs.unlink(tmpFile).catch(() => {});
      } catch {
        fileJson = stdout;
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

    let parsed: NiktoOutput;
    try {
      const jsonStart = raw.stdout.indexOf("{");
      const jsonEnd = raw.stdout.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return findings;
      parsed = JSON.parse(raw.stdout.slice(jsonStart, jsonEnd + 1));
    } catch {
      return findings;
    }

    if (!Array.isArray(parsed.vulnerabilities)) return findings;

    for (const v of parsed.vulnerabilities) {
      const message = v.msg || v.message;
      if (!message) continue;

      const url = v.url || v.uri || "/";
      const checkId = v.id || v.OSVDB || "misconfig";

      // Classify severity & category
      let severity: Finding["severity"] = "low";
      let category = "server-misconfig";
      let title = `Web Server Misconfiguration (${checkId})`;

      const lowerUrl = url.toLowerCase();
      const lowerMsg = message.toLowerCase();

      if (
        lowerUrl.includes("/admin") ||
        lowerUrl.includes(".git") ||
        lowerUrl.includes(".env") ||
        lowerUrl.includes("backup") ||
        lowerUrl.includes("config") ||
        lowerUrl.includes("passwd") ||
        lowerMsg.includes("directory indexing") ||
        lowerMsg.includes("sensitive")
      ) {
        severity = "high";
        category = "sensitive-exposure";
        title = `Exposed Sensitive Path: ${url}`;
      } else if (
        lowerMsg.includes("header") ||
        lowerMsg.includes("x-frame-options") ||
        lowerMsg.includes("x-content-type-options") ||
        lowerMsg.includes("clickjacking")
      ) {
        severity = "medium";
        category = "config";
        title = `Missing Security Header (${url})`;
      } else if (
        lowerMsg.includes("outdated") ||
        lowerMsg.includes("vulnerable")
      ) {
        severity = "medium";
        category = "server-misconfig";
        title = `Outdated Server Component Detected (${url})`;
      }

      findings.push({
        id: randomUUID(),
        projectId,
        runId,
        engine: "recon",
        ruleId: `recon-nikto-${checkId}`,
        category,
        severity,
        confidence: "high",
        title,
        message,
        location: url,
        evidence: {
          niktoId: checkId,
          method: v.method,
          url,
          osvdb: v.OSVDB,
        },
        remediation:
          category === "sensitive-exposure"
            ? "Restrict access to sensitive administrative routes and internal files immediately."
            : "Review web server configuration, enable modern security headers, and update outdated software components.",
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
