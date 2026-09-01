import type { Finding } from '@sentinel/shared';

export interface ToolAdapter {
  /** Stable id, e.g. "nmap", "nuclei". Used as ruleId prefix and in evidence. */
  id: string;
  /** Human name for reports. */
  name: string;
  /** Is the underlying binary installed and on PATH? Fail fast with a clear message if not. */
  checkAvailable(): Promise<boolean>;
  /** Run the tool against a target. Must respect a timeout and never write to the target. */
  run(target: string, options: ToolRunOptions): Promise<RawToolOutput>;
  /** Parse the tool's raw output into the shared Finding shape. Deterministic, no AI. */
  parse(raw: RawToolOutput, projectId: string, runId: string): Finding[];
}

export interface ToolRunOptions {
  timeoutMs: number;
  /** Extra CLI flags, validated against an allowlist per adapter — never pass user input to a shell unescaped. */
  extraArgs?: string[];
}

export interface RawToolOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
