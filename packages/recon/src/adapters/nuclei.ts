import { randomUUID } from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from '../adapter.js';

export const NucleiAdapter: ToolAdapter = {
  id: 'nuclei',
  name: 'Nuclei',

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync('nuclei', ['-version']);
      return true;
    } catch {
      return false;
    }
  },

  async run(target: string, options: ToolRunOptions): Promise<RawToolOutput> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    const start = Date.now();
    try {
      const args = ['-target', target, '-jsonl'];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const { stdout, stderr } = await execFileAsync('nuclei', args, { timeout: options.timeoutMs });
      return {
        stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - start
      };
    } catch (e: any) {
      return {
        stdout: e.stdout || '',
        stderr: e.stderr || e.message,
        exitCode: e.code || 1,
        durationMs: Date.now() - start
      };
    }
  },

  parse(raw: RawToolOutput, projectId: string, runId: string): Finding[] {
    const findings: Finding[] = [];
    if (!raw.stdout) return findings;

    const lines = raw.stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (!item.info || !item.info.severity) continue;

        const severityMap: Record<string, Finding['severity']> = {
          critical: 'critical',
          high: 'high',
          medium: 'medium',
          low: 'low',
          info: 'info'
        };

        const severity = severityMap[item.info.severity.toLowerCase()] || 'info';

        findings.push({
          id: randomUUID(),
          projectId,
          runId,
          engine: 'recon',
          ruleId: `recon-nuclei-${item.id || 'unknown'}`,
          category: 'vulnerability-scanner',
          severity,
          confidence: 'high',
          title: item.info.name || item.id || 'Nuclei Finding',
          message: item.info.description || `Nuclei matched template ${item.id}`,
          evidence: {
            url: item.host,
            matchedAt: item['matched-at'],
            template: item.template,
            matcherName: item['matcher-name']
          },
          remediation: item.info.remediation || 'Review Nuclei template for remediation advice.',
          timestamp: item.timestamp || new Date().toISOString()
        });
      } catch {
        // Skip invalid JSON lines silently
      }
    }
    return findings;
  }
};
