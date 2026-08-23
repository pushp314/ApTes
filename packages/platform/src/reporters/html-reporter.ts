import type { UnifiedReport } from '../orchestrator.js';
import type { Reporter } from './types.js';
import type { Finding } from '@sentinel/shared';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class HtmlReporter implements Reporter {
  generate(report: UnifiedReport): string {
    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#eab308',
      low: '#3b82f6',
      info: '#6b7280'
    };

    let findingsHtml = '';
    
    if (report.findings.length === 0) {
      findingsHtml = '<p>No findings detected.</p>';
    } else {
      const engines = Array.from(new Set(report.findings.map((f: Finding) => f.engine)));
      
      for (const engine of engines) {
        findingsHtml += `<h2>${engine.toUpperCase()} Engine</h2>`;
        
        const engineFindings = report.findings.filter((f: Finding) => f.engine === engine);
        const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        engineFindings.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));
        
        findingsHtml += `
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Title</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        for (const finding of engineFindings) {
          const color = severityColors[finding.severity] || '#6b7280';
          findingsHtml += `
            <tr>
              <td><span class="badge" style="background-color: ${color}">${finding.severity}</span></td>
              <td>${escapeHtml(finding.category)}</td>
              <td>${escapeHtml(finding.title)}</td>
              <td>${escapeHtml(finding.location ?? '')}</td>
            </tr>
          `;
        }
        
        findingsHtml += `
            </tbody>
          </table>
          <div class="details">
        `;
        
        for (const finding of engineFindings) {
          findingsHtml += `
            <div class="card">
              <h3>${escapeHtml(finding.title)} <span class="badge" style="background-color: ${severityColors[finding.severity] || '#6b7280'}">${finding.severity}</span></h3>
              <p><strong>Rule ID:</strong> ${escapeHtml(finding.ruleId)}</p>
              <p><strong>Message:</strong> ${escapeHtml(finding.message)}</p>
              ${finding.remediation ? `<p><strong>Remediation:</strong> ${escapeHtml(finding.remediation)}</p>` : ''}
              ${finding.narrative ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem;">
                <h4 style="margin-top: 0;">💬 What this means</h4>
                <p>${escapeHtml(finding.narrative.plainExplanation)}</p>
                ${finding.narrative.attackerScenario ? `<p><strong>Attack scenario:</strong> ${escapeHtml(finding.narrative.attackerScenario)}</p>` : ''}
                ${finding.narrative.businessImpact ? `<p><strong>Business impact:</strong> ${escapeHtml(finding.narrative.businessImpact)}</p>` : ''}
                ${finding.narrative.fixSteps.length > 0 ? `
                <p style="margin-bottom: 0.25rem;"><strong>How to fix:</strong></p>
                <ol style="margin-top: 0;">${finding.narrative.fixSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
                ` : ''}
              </div>
              ` : ''}
              ${finding.aiAssessment ? `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem;">
                <h4 style="margin-top: 0;">🤖 AI Assessment: ${finding.aiAssessment.verdict.toUpperCase()} (${(finding.aiAssessment.confidence * 100).toFixed(0)}%)</h4>
                <p style="margin-bottom: 0;">${escapeHtml(finding.aiAssessment.reason)}</p>
              </div>
              ` : ''}
            </div>
          `;
        }
        findingsHtml += `</div>`;
      }
    }

    let errorsHtml = '';
    if (report.errors.length > 0) {
      errorsHtml = `
        <div class="errors">
          <h2>Errors</h2>
          <ul>
            ${report.errors.map(err => `<li>❌ ${escapeHtml(err)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let chaptersHtml = '';
    if (report.chapters && report.chapters.length > 0) {
      chaptersHtml = `
        <h2>What we found, by theme</h2>
        ${report.chapters
          .map(chapter => {
            const chapterFindings = chapter.findingIds
              .map(id => report.findings.find(f => f.id === id))
              .filter((f): f is Finding => Boolean(f));
            return `
            <div class="chapter">
              <h3>${escapeHtml(chapter.title)}</h3>
              ${chapter.intro ? `<p>${escapeHtml(chapter.intro)}</p>` : ''}
              <ul>${chapterFindings
                .map(
                  f =>
                    `<li><span class="badge" style="background-color: ${severityColors[f.severity] || '#6b7280'}">${f.severity}</span> ${escapeHtml(f.title)}</li>`
                )
                .join('')}</ul>
            </div>`;
          })
          .join('')}
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Unified Report</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1f2937; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1, h2, h3 { color: #111827; }
    .header { background: #f3f4f6; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: white; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f9fafb; font-weight: 600; }
    .card { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem; }
    .card h3 { margin-top: 0; }
    .errors { background: #fee2e2; border: 1px solid #f87171; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; }
    .chapter { border-left: 3px solid #cbd5e1; padding-left: 1.25rem; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sentinel Unified Report</h1>
    <p><strong>Project ID:</strong> ${escapeHtml(report.projectId)}</p>
    <p><strong>Duration:</strong> ${report.durationMs}ms</p>
    <p><strong>Overall Score:</strong> ${report.overallScore}/100</p>
    <p><strong>Total Findings:</strong> ${report.findings.length}</p>
  </div>
  ${errorsHtml}
  ${chaptersHtml}
  ${findingsHtml}
</body>
</html>`;
  }
}
