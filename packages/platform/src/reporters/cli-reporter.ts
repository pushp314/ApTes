import type { UnifiedReport } from '../orchestrator.js';
import type { Reporter } from './types.js';
import type { Finding } from '@sentinel/shared';

export class CliReporter implements Reporter {
  generate(report: UnifiedReport): string {
    let out = `\n========================================\n`;
    out += `    SENTINEL UNIFIED REPORT\n`;
    out += `========================================\n`;
    out += `Project: ${report.projectId}\n`;
    out += `Score:   ${report.overallScore}/100\n`;
    out += `Time:    ${report.durationMs}ms\n`;
    out += `========================================\n\n`;

    if (report.errors.length > 0) {
      out += `[ERRORS]\n`;
      for (const err of report.errors) {
        out += `  - ${err}\n`;
      }
      out += `\n`;
    }

    if (report.findings.length === 0) {
      out += `[FINDINGS]\n`;
      out += `  No findings detected. Excellent!\n\n`;
      return out;
    }

    const engines = new Set(report.findings.map((f: Finding) => f.engine));

    for (const engine of engines) {
      out += `[ENGINE: ${engine.toUpperCase()}]\n`;
      const engineFindings = report.findings.filter((f: Finding) => f.engine === engine);

      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      engineFindings.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

      for (const finding of engineFindings) {
        const severityStr = finding.severity.toUpperCase().padEnd(8, ' ');
        out += `  [${severityStr}] ${finding.title}\n`;
        out += `             ${finding.message}\n`;
        out += `             Rule: ${finding.ruleId} | Location: ${finding.location}\n`;
        if (finding.remediation) {
          out += `             Fix: ${finding.remediation}\n`;
        }
        if (finding.aiAssessment) {
          out += `             [AI] Verdict: ${finding.aiAssessment.verdict.toUpperCase()} (${(finding.aiAssessment.confidence * 100).toFixed(0)}%)\n`;
          out += `             [AI] Reason: ${finding.aiAssessment.reason}\n`;
        }
        out += `\n`;
      }
    }

    out += `========================================\n`;
    out += `Found ${report.findings.length} total issue(s).\n`;
    return out;
  }
}
