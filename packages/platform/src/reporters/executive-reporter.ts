import type { Finding } from '@sentinel/shared';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * An Executive HTML Reporter that queries the local LLM to generate a high-level summary.
 */
export async function generateExecutiveReport(
  findings: Finding[],
  outputDir: string,
  model = 'llama3'
): Promise<string> {
  let llmSummary = '<p>Local LLM integration was skipped or failed to generate a summary.</p>';
  
  if (findings.length > 0) {
    try {
      const prompt = `You are an executive security auditor. I will give you a list of security findings. 
Provide a high-level, VC-friendly Markdown summary consisting of:
1. An overall Security Posture Score (A to F)
2. Top 3 Attack Vectors
3. Estimated Remediation Effort
Findings: ${JSON.stringify(findings.map(f => ({ title: f.title, severity: f.severity, category: f.category })))}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          format: 'json',
          stream: false
        }),
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json() as { response: string };
        // Very basic markdown-to-html conversion for the report
        llmSummary = data.response
          .replace(/\\n/g, '<br>')
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
          .replace(/# (.*?)(<br>|$)/g, '<h2>$1</h2>')
          .replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>');
      }
    } catch {
      // Ignore failures
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Executive Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
    .summary-box { background: #f8f9fa; border-left: 4px solid #3498db; padding: 1.5rem; margin: 2rem 0; border-radius: 4px; }
    .stats { display: flex; gap: 2rem; margin-bottom: 2rem; }
    .stat-card { background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; text-align: center; }
    .stat-value { font-size: 2.5rem; font-weight: bold; color: #e74c3c; }
    .stat-label { color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <h1>Sentinel Executive Audit Report</h1>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${findings.length}</div>
      <div class="stat-label">Total Findings</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${findings.filter(f => f.severity === 'critical' || f.severity === 'high').length}</div>
      <div class="stat-label">Critical / High</div>
    </div>
  </div>

  <div class="summary-box">
    ${llmSummary}
  </div>
</body>
</html>`;

  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'sentinel-executive-report.html');
  await fs.writeFile(outputPath, html, 'utf8');
  
  return outputPath;
}
