import type { Finding } from '@sentinel/shared';
import { NucleiAdapter } from './adapters/nuclei.js';
import { NmapAdapter } from './adapters/nmap.js';

export const RECON_ADAPTERS = [NucleiAdapter, NmapAdapter];

export interface ReconRunnerOptions {
  adapters: string[];
  scanTimeoutMs?: number;
  onProgress?: (msg: string) => void;
}

export interface ReconResult {
  findings: Finding[];
  error?: string;
  durationMs: number;
}

export async function runReconEngine(
  targetUrl: string,
  projectId: string,
  runId: string,
  options: ReconRunnerOptions
): Promise<ReconResult> {
  const start = Date.now();
  let findings: Finding[] = [];
  const errors: string[] = [];

  const targetHost = new URL(targetUrl).hostname;

  for (const adapterId of options.adapters) {
    const adapter = RECON_ADAPTERS.find(a => a.id === adapterId);
    if (!adapter) {
      errors.push(`Unknown recon adapter: ${adapterId}`);
      continue;
    }

    options.onProgress?.(`Recon: Checking availability for ${adapter.name}...`);
    const isAvailable = await adapter.checkAvailable();
    if (!isAvailable) {
      options.onProgress?.(`Recon: Skipping ${adapter.name} (not installed or not on PATH)`);
      continue;
    }

    options.onProgress?.(`Recon: Running ${adapter.name} against ${targetHost}...`);
    try {
      const output = await adapter.run(targetHost, {
        timeoutMs: options.scanTimeoutMs || 60000
      });

      if (output.exitCode !== 0 && !output.stdout) {
        errors.push(`${adapter.name} failed with code ${output.exitCode}: ${output.stderr}`);
        continue;
      }

      const adapterFindings = adapter.parse(output, projectId, runId);
      findings = findings.concat(adapterFindings);
      options.onProgress?.(`Recon: ${adapter.name} found ${adapterFindings.length} issues.`);
    } catch (err: any) {
      errors.push(`Error running ${adapter.name}: ${err.message}`);
    }
  }

  return {
    findings,
    durationMs: Date.now() - start,
    error: errors.length > 0 ? errors.join('\n') : undefined
  };
}
