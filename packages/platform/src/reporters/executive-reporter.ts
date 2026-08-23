import type { Finding, AuditChapter } from '@sentinel/shared';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { OllamaProvider } from '../ai/ollama-provider.js';

/**
 * Executive HTML Reporter.
 *
 * Produces a VC-friendly summary page. When a local Ollama model is
 * reachable it generates the narrative sections via schema-constrained
 * structured output; otherwise every section falls back to deterministic
 * content computed from the findings themselves — the report is always
 * complete and never depends on AI being up.
 */

export interface ExecutiveSummaryData {
  postureGrade: string;
  executiveSummary: string;
  topRisks: { title: string; why: string; effort: string }[];
  nextSteps: string[];
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    postureGrade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    executiveSummary: { type: 'string' },
    topRisks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          effort: { type: 'string', enum: ['hours', 'a day', 'a few days', 'over a week'] },
        },
        required: ['title', 'why', 'effort'],
      },
    },
    nextSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['postureGrade', 'executiveSummary', 'topRisks', 'nextSteps'],
} as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Deterministic posture grade derived purely from finding counts. */
function computePostureGrade(findings: Finding[]): string {
  const criticals = findings.filter(f => f.severity === 'critical').length;
  const highs = findings.filter(f => f.severity === 'high').length;
  if (criticals >= 3) return 'F';
  if (criticals >= 1) return 'D';
  if (highs >= 5) return 'C';
  if (highs >= 1) return 'B';
  return 'A';
}

/** Deterministic summary used when no LLM is available. */
function deterministicSummary(
  findings: Finding[],
  chapters?: AuditChapter[]
): ExecutiveSummaryData {
  const grade = computePostureGrade(findings);
  const counts = severityCounts(findings);

  const executiveSummary =
    `The scan identified ${findings.length} issue${findings.length === 1 ? '' : 's'}: ` +
    `${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low. ` +
    (chapters && chapters.length > 0
      ? `Issues cluster into ${chapters.length} themes, detailed below.`
      : `Each issue is listed with its location and a concrete fix.`);

  const effortFor = (severity: string): string =>
    severity === 'critical' ? 'a day' : severity === 'high' ? 'a few days' : 'hours';

  const topRisks = [...findings]
    .sort((a, b) => severityRank(a) - severityRank(b))
    .slice(0, 3)
    .map(f => ({
      title: f.title,
      why: f.message.slice(0, 300),
      effort: effortFor(f.severity),
    }));

  const nextSteps = [...findings]
    .sort((a, b) => severityRank(a) - severityRank(b))
    .slice(0, 5)
    .map(f => `${f.title} (${f.location ?? f.engine}): ${f.remediation}`.slice(0, 400));

  return { postureGrade: grade, executiveSummary, topRisks, nextSteps };
}

function severityRank(f: Finding): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[f.severity] ?? 5;
}

function severityCounts(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  }
  return counts;
}

async function llmSummary(
  findings: Finding[],
  chapters: AuditChapter[] | undefined,
  model: string
): Promise<ExecutiveSummaryData | null> {
  if (findings.length === 0) return null;

  const payload = {
    totalFindings: findings.length,
    bySeverity: severityCounts(findings),
    chapters:
      chapters?.map(c => ({
        title: c.title,
        intro: c.intro,
        findingCount: c.findingIds.length,
      })) ??
      Array.from(new Set(findings.map(f => f.category))).map(category => ({
        title: category,
        intro: '',
        findingCount: findings.filter(f => f.category === category).length,
      })),
  };

  const raw = await new OllamaProvider().generateStructured(
    `You are an executive security auditor writing for company leadership and investors.
You write short, concrete, jargon-free English. You never invent risks that are not in the data.
Effort estimates use exactly one of: "hours", "a day", "a few days", "over a week".`,
    `Summarize this security audit result for executives.

Scan data:
${JSON.stringify(payload, null, 2)}

Respond ONLY with JSON matching the schema: postureGrade (A-F overall),
executiveSummary (2-3 sentences: where the product stands and the single biggest theme of risk),
topRisks (the 3 most important issues: title, why it matters in business terms, effort to fix),
nextSteps (3-5 ordered actions, most important first).`,
    SUMMARY_SCHEMA,
    { model, timeoutMs: 90000 }
  );

  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const grades = ['A', 'B', 'C', 'D', 'F'];
  const efforts = ['hours', 'a day', 'a few days', 'over a week'];

  const topRisks = Array.isArray(record.topRisks)
    ? record.topRisks
        .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
        .slice(0, 3)
        .map(r => ({
          title: String(r.title ?? '').slice(0, 200),
          why: String(r.why ?? '').slice(0, 600),
          effort: efforts.includes(String(r.effort)) ? String(r.effort) : 'a few days',
        }))
        .filter(r => r.title.length > 0)
    : [];

  const nextSteps = Array.isArray(record.nextSteps)
    ? record.nextSteps.filter((s): s is string => typeof s === 'string').slice(0, 5)
    : [];

  const grade = typeof record.postureGrade === 'string' && grades.includes(record.postureGrade)
    ? record.postureGrade
    : computePostureGrade(findings);
  const summaryText =
    typeof record.executiveSummary === 'string'
      ? record.executiveSummary.slice(0, 1500)
      : '';

  if (topRisks.length === 0 || summaryText.length === 0) return null;

  return { postureGrade: grade, executiveSummary: summaryText, topRisks, nextSteps };
}

export async function generateExecutiveReport(
  findings: Finding[],
  outputDir: string,
  model = 'llama3',
  options: { url?: string; chapters?: AuditChapter[] } = {}
): Promise<string> {
  const chapters = options.chapters;
  const data =
    (await llmSummary(findings, chapters, model).catch(() => null)) ??
    deterministicSummary(findings, chapters);

  const counts = severityCounts(findings);
  const gradeColor: Record<string, string> = {
    A: '#16a34a', B: '#65a30d', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
  };

  const risksHtml = data.topRisks
    .map(
      risk => `
      <div class="risk">
        <h3>${escapeHtml(risk.title)}</h3>
        <p>${escapeHtml(risk.why)}</p>
        <p class="effort">Estimated fix effort: <strong>${escapeHtml(risk.effort)}</strong></p>
      </div>`
    )
    .join('');

  const stepsHtml =
    data.nextSteps.length > 0
      ? `<ol>${data.nextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>`
      : '<p>No open issues — nothing to do.</p>';

  const chaptersHtml =
    chapters && chapters.length > 0
      ? `<h2>What we found, by theme</h2>` +
        chapters
          .map(chapter => {
            const chapterFindings = chapter.findingIds
              .map(id => findings.find(f => f.id === id))
              .filter((f): f is Finding => Boolean(f));
            return `
            <div class="chapter">
              <h3>${escapeHtml(chapter.title)}</h3>
              ${chapter.intro ? `<p>${escapeHtml(chapter.intro)}</p>` : ''}
              <ul>${chapterFindings
                .map(
                  f =>
                    `<li><span class="badge" style="background:${gradeColor[f.severity] ?? '#6b7280'}">${escapeHtml(f.severity)}</span> ${escapeHtml(f.title)}</li>`
                )
                .join('')}</ul>
            </div>`;
          })
          .join('')
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Executive Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
    h2 { color: #2c3e50; margin-top: 2rem; }
    .summary-box { background: #f8f9fa; border-left: 4px solid #3498db; padding: 1.5rem; margin: 2rem 0; border-radius: 4px; font-size: 1.05rem; }
    .stats { display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .stat-card { background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex: 1; text-align: center; min-width: 120px; }
    .stat-value { font-size: 2.5rem; font-weight: bold; color: #e74c3c; }
    .stat-label { color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
    .risk { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
    .risk h3 { margin: 0 0 0.5rem 0; }
    .effort { color: #7f8c8d; font-size: 0.9rem; }
    .chapter { border-left: 3px solid #cbd5e1; padding-left: 1.25rem; margin-bottom: 1.5rem; }
    .badge { display: inline-block; padding: 0.1rem 0.45rem; border-radius: 999px; color: white; font-size: 0.75rem; text-transform: uppercase; margin-right: 0.5rem; }
    .footer-note { color: #94a3b8; font-size: 0.85rem; margin-top: 3rem; }
  </style>
</head>
<body>
  <h1>Sentinel Executive Audit Report</h1>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value" style="color: ${gradeColor[data.postureGrade] ?? '#334155'}">${data.postureGrade}</div>
      <div class="stat-label">Security Posture</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${findings.length}</div>
      <div class="stat-label">Total Findings</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${(counts.critical ?? 0) + (counts.high ?? 0)}</div>
      <div class="stat-label">Critical / High</div>
    </div>
  </div>

  <div class="summary-box">
    ${escapeHtml(data.executiveSummary)}
  </div>

  <h2>Top risks</h2>
  ${risksHtml || '<p>No significant risks found.</p>'}

  <h2>Recommended next steps</h2>
  ${stepsHtml}

  ${chaptersHtml}

  <p class="footer-note">Narrative sections generated with local AI (${escapeHtml(model)}) where available;
  all facts derive from deterministic scanner output.</p>
</body>
</html>`;

  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'sentinel-executive-report.html');
  await fs.writeFile(outputPath, html, 'utf8');

  return outputPath;
}
