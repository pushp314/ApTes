import { randomUUID } from "node:crypto";
import type { Finding } from "@sentinel/shared";
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from "../adapter.js";

interface FfufResultItem {
  input: Record<string, string>;
  position: number;
  status: number;
  length: number;
  words: number;
  lines: number;
  "content-type"?: string;
  redirectlocation?: string;
  url: string;
}

interface FfufOutput {
  commandline?: string;
  time?: string;
  results?: FfufResultItem[];
}

const DEFAULT_ENDPOINTS = [
  "admin",
  "api",
  "v1",
  "v2",
  "metrics",
  "health",
  "swagger",
  "docs",
  "debug",
  "console",
  "graphql",
  ".env",
  "actuator",
  "status",
  "login",
];

export const FfufAdapter: ToolAdapter = {
  id: "ffuf",
  name: "ffuf",

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync("ffuf", ["-V"]);
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

    const baseUrl =
      target.startsWith("http://") || target.startsWith("https://")
        ? target
        : `https://${target}`;

    const tmpOut = path.join(tmpdir(), `ffuf-${Date.now()}.json`);
    const tmpWordlist = path.join(tmpdir(), `ffuf-words-${Date.now()}.txt`);

    try {
      await fs.writeFile(tmpWordlist, DEFAULT_ENDPOINTS.join("\n"), "utf-8");

      const args = [
        "-u",
        `${baseUrl.replace(/\/+$/, "")}/FUZZ`,
        "-w",
        tmpWordlist,
        "-of",
        "json",
        "-o",
        tmpOut,
        "-mc",
        "200,204,301,302,307,401,403",
      ];

      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }

      const { stdout, stderr } = await execFileAsync("ffuf", args, {
        timeout: options.timeoutMs,
      });

      let fileJson = "";
      try {
        fileJson = await fs.readFile(tmpOut, "utf-8");
        await fs.unlink(tmpOut).catch(() => {});
      } catch {
        fileJson = stdout;
      }
      await fs.unlink(tmpWordlist).catch(() => {});

      return {
        stdout: fileJson || stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      await fs.unlink(tmpWordlist).catch(() => {});
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

    let parsed: FfufOutput;
    try {
      const jsonStart = raw.stdout.indexOf("{");
      const jsonEnd = raw.stdout.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) return findings;
      parsed = JSON.parse(raw.stdout.slice(jsonStart, jsonEnd + 1));
    } catch {
      return findings;
    }

    if (!Array.isArray(parsed.results)) return findings;

    for (const r of parsed.results) {
      const keyword = (r.input?.FUZZ || r.input?.fuzz || "").toLowerCase();
      const status = r.status;
      const url = r.url;

      let severity: Finding["severity"] = "info";
      let category = "attack-surface";
      let title = `Discovered Endpoint: ${url} (HTTP ${status})`;
      let message = `Endpoint discovery detected active route ${url} returning HTTP ${status} (Length: ${r.length}, Words: ${r.words}).`;

      if (status === 200) {
        if (
          keyword.includes("admin") ||
          keyword.includes("debug") ||
          keyword.includes("metrics") ||
          keyword.includes("actuator") ||
          keyword.includes("console") ||
          keyword.includes(".env") ||
          keyword.includes("backup")
        ) {
          severity = "high";
          category = "sensitive-exposure";
          title = `Exposed Administrative / Sensitive Endpoint: ${url}`;
          message = `Fuzzing discovered an accessible sensitive endpoint (${url}) returning HTTP 200 without access controls.`;
        } else if (
          keyword.includes("swagger") ||
          keyword.includes("docs") ||
          keyword.includes("graphql") ||
          keyword.includes("api")
        ) {
          severity = "info";
          category = "attack-surface";
          title = `Discovered API / Documentation Endpoint: ${url}`;
        } else {
          severity = "low";
          category = "attack-surface";
        }
      } else if (status === 401 || status === 403) {
        severity = "low";
        category = "attack-surface";
        title = `Protected Internal Endpoint Detected: ${url} (HTTP ${status})`;
        message = `Internal route ${url} responded with HTTP ${status}, confirming the existence of a protected resource.`;
      }

      findings.push({
        id: randomUUID(),
        projectId,
        runId,
        engine: "recon",
        ruleId: `recon-ffuf-${keyword || "endpoint"}`,
        category,
        severity,
        confidence: "high",
        title,
        message,
        location: url,
        evidence: {
          keyword,
          status: r.status,
          length: r.length,
          words: r.words,
          contentType: r["content-type"],
          redirectLocation: r.redirectlocation,
          url,
        },
        remediation:
          category === "sensitive-exposure"
            ? "Restrict access to internal dashboards and metrics using authentication gateways or network segmentation."
            : "Ensure sensitive administrative or internal routes are not exposed publicly.",
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  },
};
