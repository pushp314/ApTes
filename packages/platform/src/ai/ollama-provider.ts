import type { Finding } from '@sentinel/shared';
import type { AIProvider, AIContext, AIAnalysis } from './provider.js';

/** Fallback chain when the requested model is not available locally. */
const MODEL_FALLBACKS = ['mistral', 'qwen2.5-coder'];

/** Context window requested from Ollama. The 2048 default silently
 * truncates large evidence batches mid-JSON, causing parse flakiness. */
const NUM_CTX = 8192;

export class OllamaProvider implements AIProvider {
  async analyzeFindings(findings: Finding[], context: AIContext): Promise<AIAnalysis[]> {
    if (findings.length === 0) return [];

    const payload = findings.map(f => ({
      findingId: f.id,
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      message: f.message,
      location: f.location,
      evidence: f.evidence
    }));

    const system = `You are a security and static analysis expert. For each finding, decide whether it is a true positive or a false positive and explain why in plain language.`;

    const user = `For each finding, provide a structured assessment.
Respond ONLY with a JSON object matching this schema exactly:
{
  "analyses": [
    {
      "findingId": "string",
      "assessment": {
        "verdict": "confirmed" | "likely" | "uncertain" | "dismissed",
        "confidence": number,
        "reason": "string (explain why)",
        "impact": "string (optional)",
        "remediation": "string (optional)",
        "additionalEvidenceNeeded": ["string"],
        "patch": "string (unified diff .patch format to fix the vulnerability, or omit if not applicable)",
        "poc": "string (executable curl command or python script proving the exploit, or omit if not applicable)"
      }
    }
  ]
}

Findings to analyze:
${JSON.stringify(payload, null, 2)}`;

    const result = await this.generateStructured(system, user, TRIAGE_SCHEMA, context);
    if (!result || typeof result !== 'object') return [];

    const analysesRaw = (result as { analyses?: unknown }).analyses;
    if (!Array.isArray(analysesRaw)) return [];

    const analyses: AIAnalysis[] = [];
    const validVerdicts = ['confirmed', 'likely', 'uncertain', 'dismissed'];

    for (const item of analysesRaw) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const assessment = record.assessment as Record<string, unknown> | undefined;
      if (!assessment) continue;

      // Ensure the findingId actually matches one of the findings we sent
      if (!originalFindingsMatch(findings, record.findingId)) continue;

      const v = assessment.verdict;
      const verdict = typeof v === 'string' && validVerdicts.includes(v) ? v : 'uncertain';

      analyses.push({
        findingId: String(record.findingId),
        assessment: {
          verdict: verdict as 'confirmed' | 'likely' | 'uncertain' | 'dismissed',
          confidence: typeof assessment.confidence === 'number' ? assessment.confidence : 0.5,
          reason: typeof assessment.reason === 'string' ? assessment.reason : 'No reasoning provided by AI.',
          impact: asString(assessment.impact),
          remediation: asString(assessment.remediation),
          additionalEvidenceNeeded: Array.isArray(assessment.additionalEvidenceNeeded)
            ? assessment.additionalEvidenceNeeded.filter((s): s is string => typeof s === 'string')
            : undefined,
          patch: asString(assessment.patch),
          poc: asString(assessment.poc)
        }
      });
    }

    return analyses;
  }

  /**
   * Sends a chat request with a system prompt and a JSON-schema format
   * constraint (Ollama structured outputs). Falls back across local models
   * and degrades to plain `json` mode for older Ollama versions that do
   * not support schema formats.
   */
  async generateStructured(
    system: string,
    user: string,
    schema: Record<string, unknown>,
    context: AIContext
  ): Promise<unknown | null> {
    const url = context.url || 'http://localhost:11434';
    const models = [context.model, ...MODEL_FALLBACKS].filter(
      (m, i, arr) => Boolean(m) && arr.indexOf(m) === i
    ) as string[];

    for (const model of models) {
      for (const format of [schema, 'json']) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), context.timeoutMs || 60000);

          const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
              ],
              format,
              stream: false,
              options: {
                num_ctx: NUM_CTX,
                temperature: 0
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // Older Ollama rejects non-"json" formats — degrade once and retry.
            continue;
          }

          const data = await response.json() as { message?: { content?: string } };
          const content = data.message?.content;
          if (!content) continue;

          const parsed = JSON.parse(content);
          logTokens(model, system.length + user.length, content.length);
          return parsed;
        } catch {
          // Try the next format/model; fail gracefully overall.
        }
      }
    }

    // eslint-disable-next-line no-console
    console.warn(`[Sentinel AI] No local model responded (tried: ${models.join(', ')}).`);
    return null;
  }
}

function originalFindingsMatch(findings: Finding[], findingId: unknown): boolean {
  return typeof findingId === 'string' && findings.some(f => f.id === findingId);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function logTokens(model: string, inputChars: number, outputChars: number): void {
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.ceil(outputChars / 4);
  // eslint-disable-next-line no-console
  console.log(`[Sentinel AI] ${model} tokens estimated: ~${inputTokens} input, ~${outputTokens} output.`);
}

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    analyses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          findingId: { type: 'string' },
          assessment: {
            type: 'object',
            properties: {
              verdict: { type: 'string', enum: ['confirmed', 'likely', 'uncertain', 'dismissed'] },
              confidence: { type: 'number' },
              reason: { type: 'string' },
              impact: { type: 'string' },
              remediation: { type: 'string' },
              additionalEvidenceNeeded: { type: 'array', items: { type: 'string' } },
              patch: { type: 'string' },
              poc: { type: 'string' }
            },
            required: ['findingId', 'assessment']
          }
        },
        required: ['findingId', 'assessment']
      }
    }
  },
  required: ['analyses']
} as const;
