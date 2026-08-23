import type { UnifiedReport } from '../orchestrator.js';
import type { Reporter } from './types.js';
import type { Finding } from '@sentinel/shared';

export class MarkdownReporter implements Reporter {
  generate(report: UnifiedReport): string {
    let md = `# Sentinel Unified Report\n\n`;
    md += `- **Project ID:** ${report.projectId}\n`;
    md += `- **Duration:** ${report.durationMs}ms\n`;
    md += `- **Overall Score:** ${report.overallScore}/100\n`;
    md += `- **Total Findings:** ${report.findings.length}\n\n`;

    if (report.errors.length > 0) {
      md += `## Errors\n\n`;
      for (const err of report.errors) {
        md += `- ❌ ${err}\n`;
      }
      md += `\n`;
    }

    if (report.findings.length === 0) {
      md += `## Findings\n\nNo findings detected.\n`;
      return md;
    }

    md += `## Findings Summary\n\n`;

    // Group findings by engine
    const engines = new Set(report.findings.map((f: Finding) => f.engine));

    for (const engine of engines) {
      md += `### ${engine.toUpperCase()} Engine\n\n`;
      const engineFindings = report.findings.filter((f: Finding) => f.engine === engine);

      // Sort by severity (critical -> high -> medium -> low -> info)
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      engineFindings.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

      md += `| Severity | Category | Title | Location |\n`;
      md += `|----------|----------|-------|----------|\n`;

      for (const finding of engineFindings) {
        const severityIndicator = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : finding.severity === 'medium' ? '🟡' : finding.severity === 'low' ? '🔵' : '⚪';
        md += `| ${severityIndicator} ${finding.severity} | ${finding.category} | ${finding.title} | ${finding.location} |\n`;
      }
      md += `\n`;
      
      md += `#### Details\n\n`;
      for (const finding of engineFindings) {
        md += `- **${finding.title}** (${finding.severity})\n`;
        md += `  - **Rule ID:** ${finding.ruleId}\n`;
        md += `  - **Message:** ${finding.message}\n`;
        if (finding.remediation) {
          md += `  - **Remediation:** ${finding.remediation}\n`;
        }
        if (finding.aiAssessment) {
          md += `  - **🤖 AI Verdict:** ${finding.aiAssessment.verdict.toUpperCase()} (${(finding.aiAssessment.confidence * 100).toFixed(0)}%)\n`;
          md += `  - **🤖 AI Insight:** ${finding.aiAssessment.reason}\n`;
        }
        md += `\n`;
      }
    }

    return md;
  }
}
