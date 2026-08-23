/**
 * CodeSentinel's optional local AI triage.
 *
 * This intentionally lives in CodeSentinel rather than importing the platform:
 * CodeSentinel must remain usable as a standalone local source scanner.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AiAssessment, Finding } from '@sentinel/shared';

export interface LocalAiReviewerOptions {
  enabled?: boolean;
  budget?: number;
  model?: string;
  url?: string;
  projectDir: string;
}

interface CachedAssessment {
  assessment: AiAssessment;
}

interface Analysis {
  findingId: string;
  assessment: AiAssessment;
}

const REDACTION_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(sk_live_[0-9a-zA-Z]+|sk_test_[0-9a-zA-Z]+|sk-[a-zA-Z0-9]{20,})\b/g, '[REDACTED_API_KEY]'],
  [/Bearer\s+[A-Za-z0-9-._~+/]+=*/g, '[REDACTED_BEARER_TOKEN]'],
  [/(?<=:\/\/)[^:\s]+:[^@\s]+@/g, '[REDACTED_URL_AUTH]'],
  [/(AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, '[REDACTED_AWS_KEY]'],
];

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return REDACTION_RULES.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value);
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, redact(nested)]));
  }
  return value;
}

async function sourceSnippet(finding: Finding, projectDir: string): Promise<string | undefined> {
  if (!finding.location) return undefined;
  const match = /^(.*):(\d+)(?::\d+)?$/.exec(finding.location);
  if (!match?.[1] || !match[2]) return undefined;

  try {
    const file = await fs.readFile(path.resolve(projectDir, match[1]), 'utf8');
    const line = Number.parseInt(match[2], 10);
    const lines = file.split('\n');
    const start = Math.max(0, line - 16);
    return lines.slice(start, start + 30).join('\n');
  } catch {
    return undefined;
  }
}

export class LocalAiReviewer {
  private readonly enabled: boolean;
  private readonly budget: number;
  private readonly model: string;
  private readonly url: string;
  private readonly cachePath: string;
  private cache: Record<string, CachedAssessment> = {};

  constructor(options: LocalAiReviewerOptions) {
    this.enabled = options.enabled ?? false;
    this.budget = options.budget ?? 0;
    this.model = options.model ?? 'llama3';
    this.url = options.url ?? 'http://localhost:11434';
    this.cachePath = path.join(options.projectDir, '.sentinel-ai-cache.json');
  }

  async review(findings: Finding[], projectDir: string): Promise<Finding[]> {
    if (!this.enabled || this.budget <= 0) return findings;
    await this.loadCache();

    const completed: Finding[] = [];
    const pending: Array<{ finding: Finding; fingerprint: string }> = [];
    for (const finding of findings) {
      if (finding.confidence !== 'low') {
        completed.push(finding);
        continue;
      }

      const safeFinding: Finding = {
        ...finding,
        evidence: redact({
          ...finding.evidence,
          sourceCodeSnippet: await sourceSnippet(finding, projectDir),
        }) as Record<string, unknown>,
      };
      const fingerprint = createHash('sha256')
        .update(`${safeFinding.ruleId}|${safeFinding.location ?? 'none'}|${JSON.stringify(safeFinding.evidence)}|${this.model}`)
        .digest('hex');
      const cached = this.cache[fingerprint];
      if (cached) completed.push({ ...safeFinding, aiAssessment: cached.assessment });
      else pending.push({ finding: safeFinding, fingerprint });
    }

    const allowed = pending.slice(0, this.budget);
    const skipped = pending.slice(this.budget);
    if (skipped.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[CodeSentinel AI] Budget exhausted (${this.budget}); ${skipped.length} low-confidence findings were not sent to AI.`);
      completed.push(...skipped.map(({ finding }) => finding));
    }

    for (let offset = 0; offset < allowed.length; offset += 10) {
      const batch = allowed.slice(offset, offset + 10);
      const analyses = await this.analyze(batch.map(({ finding }) => finding));
      for (const item of batch) {
        const analysis = analyses.find((candidate) => candidate.findingId === item.finding.id);
        if (analysis) {
          this.cache[item.fingerprint] = { assessment: analysis.assessment };
          completed.push({ ...item.finding, aiAssessment: analysis.assessment });
        } else {
          completed.push(item.finding);
        }
      }
    }

    await this.saveCache();
    return completed;
  }

  private async analyze(findings: Finding[]): Promise<Analysis[]> {
    const payload = findings.map(({ id, ruleId, category, severity, title, message, location, evidence }) => ({
      findingId: id, ruleId, category, severity, title, message, location, evidence,
    }));
    const prompt = `You are reviewing deterministic CodeSentinel findings. Assess only the supplied low-confidence findings; do not invent findings. Respond only with JSON: {"analyses":[{"findingId":"string","assessment":{"verdict":"confirmed|likely|uncertain|dismissed","confidence":0.0,"reason":"string","impact":"string?","remediation":"string?","additionalEvidenceNeeded":["string"]}}]}. Findings:\n${JSON.stringify(payload)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const response = await fetch(`${this.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, format: 'json', stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) return [];
      const body = await response.json() as { response?: string };
      const parsed = body.response ? JSON.parse(body.response) as { analyses?: unknown } : {};
      if (!Array.isArray(parsed.analyses)) return [];

      const findingIds = new Set(findings.map((finding) => finding.id));
      const verdicts = new Set<AiAssessment['verdict']>(['confirmed', 'likely', 'uncertain', 'dismissed']);
      return parsed.analyses.flatMap((entry): Analysis[] => {
        if (!entry || typeof entry !== 'object') return [];
        const candidate = entry as { findingId?: unknown; assessment?: Record<string, unknown> };
        if (typeof candidate.findingId !== 'string' || !findingIds.has(candidate.findingId) || !candidate.assessment) return [];
        const verdict = candidate.assessment.verdict;
        if (typeof verdict !== 'string' || !verdicts.has(verdict as AiAssessment['verdict'])) return [];
        return [{
          findingId: candidate.findingId,
          assessment: {
            verdict: verdict as AiAssessment['verdict'],
            confidence: typeof candidate.assessment.confidence === 'number' ? candidate.assessment.confidence : 0.5,
            reason: typeof candidate.assessment.reason === 'string' ? candidate.assessment.reason : 'No reasoning provided by AI.',
            ...(typeof candidate.assessment.impact === 'string' ? { impact: candidate.assessment.impact } : {}),
            ...(typeof candidate.assessment.remediation === 'string' ? { remediation: candidate.assessment.remediation } : {}),
            ...(Array.isArray(candidate.assessment.additionalEvidenceNeeded) ? { additionalEvidenceNeeded: candidate.assessment.additionalEvidenceNeeded.filter((value): value is string => typeof value === 'string') } : {}),
          },
        }];
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[CodeSentinel AI] Ollama is unavailable; continuing without AI: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async loadCache(): Promise<void> {
    try {
      this.cache = JSON.parse(await fs.readFile(this.cachePath, 'utf8')) as Record<string, CachedAssessment>;
    } catch {
      this.cache = {};
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch {
      // Caching is an optimization and must not fail a source scan.
    }
  }
}
