/**
 * NarrativeEngine — turns deterministic findings into human language.
 *
 * Two capabilities, both optional and budget-capped:
 *  1. narrate()    — per-finding plain-language stories (what/why/how-to-fix)
 *  2. chapterize() — group findings into themed audit chapters
 *
 * Hard rules enforced here (see guardrails.ts):
 *  - AI output is advisory-only; severity/confidence/messages never change
 *  - every narrative is sanitized and length-capped before attachment
 *  - chapters may only reference finding IDs that actually exist
 *  - all results are cached by content fingerprint
 */

import type { AuditChapter, Finding, FindingNarrative } from '@sentinel/shared';
import type { AIProvider, AIContext } from './provider.js';
import { SecretRedactor } from './redactor.js';
import { AICache } from './cache.js';
import { filterChapters, sanitizeNarrative } from './guardrails.js';
import crypto from 'node:crypto';

export interface NarrativeOptions {
  model?: string;
  url?: string;
  /** Max findings to narrate (chapters cost one extra call). */
  budget?: number;
  timeoutMs?: number;
}

const NARRATIVE_SCHEMA = {
  type: 'object',
  properties: {
    plainExplanation: { type: 'string' },
    attackerScenario: { type: 'string' },
    businessImpact: { type: 'string' },
    fixSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['plainExplanation', 'attackerScenario', 'businessImpact', 'fixSteps'],
} as const;

const CHAPTERS_SCHEMA = {
  type: 'object',
  properties: {
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          intro: { type: 'string' },
          findingIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'intro', 'findingIds'],
      },
    },
  },
  required: ['chapters'],
} as const;

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export class NarrativeEngine {
  private provider: AIProvider;
  private cache: AICache;
  private redactor: SecretRedactor;
  private options: Required<Omit<NarrativeOptions, 'url' | 'timeoutMs'>> & NarrativeOptions;

  constructor(
    provider: AIProvider,
    cache: AICache,
    options: NarrativeOptions = {}
  ) {
    this.provider = provider;
    this.cache = cache;
    this.redactor = new SecretRedactor();
    this.options = {
      model: options.model ?? 'llama3',
      url: options.url,
      budget: options.budget ?? 4,
      timeoutMs: options.timeoutMs ?? 90000,
    };
  }

  /**
   * Attach plain-language narratives to the most important findings.
   * Priority: critical > high > medium > low. Returns number narrated.
   */
  async narrate(findings: Finding[]): Promise<number> {
    if (findings.length === 0 || this.options.budget <= 0) return 0;
    await this.cache.load();

    const candidates = [...findings]
      .filter(f => !f.narrative)
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5))
      .slice(0, this.options.budget);

    let narrated = 0;

    for (const finding of candidates) {
      const fingerprint = this.fingerprint(
        'narrative',
        `${finding.id}|${finding.ruleId}|${finding.message}`
      );
      const cached = this.cache.getAny(fingerprint);

      let narrative: FindingNarrative | null =
        cached !== undefined ? sanitizeNarrative(cached) : null;

      if (!narrative) {
        const raw = await this.provider.generateStructured(
          NARRATE_SYSTEM_PROMPT,
          buildNarratePrompt(finding),
          NARRATIVE_SCHEMA,
          this.context()
        );
        narrative = sanitizeNarrative(raw);
        if (narrative) {
          this.cache.setAny(fingerprint, raw);
          await this.cache.save();
        }
      }

      // Guardrail: attach only the sanitized narrative; nothing else mutates.
      if (narrative) {
        finding.narrative = narrative;
        narrated += 1;
      }
    }

    return narrated;
  }

  /**
   * Group findings into themed audit chapters. Returns [] when the LLM is
   * unavailable — callers fall back to deterministicChapters().
   */
  async chapterize(findings: Finding[]): Promise<AuditChapter[]> {
    if (findings.length < 3) return [];
    await this.cache.load();

    const payload = findings.map(f => ({
      id: f.id,
      engine: f.engine,
      category: f.category,
      severity: f.severity,
      title: f.title,
      message: this.redactor.redact(f.message),
    }));

    const fingerprint = this.fingerprint(
      'chapters',
      findings.map(f => f.id).join(',')
    );
    const cached = this.cache.getAny(fingerprint);
    if (cached !== undefined) {
      return filterChapters((cached as { chapters?: unknown }).chapters, findings);
    }

    const raw = await this.provider.generateStructured(
      CHAPTERS_SYSTEM_PROMPT,
      `Group these ${findings.length} security audit findings into 3-6 thematic chapters.
Write each intro for a product manager: explain the theme in one or two sentences of plain
language, why it matters for THIS application specifically, no generic filler.
Every finding id must appear in exactly one chapter's findingIds.

Findings:
${JSON.stringify(payload, null, 2)}`,
      CHAPTERS_SCHEMA,
      this.context()
    );

    if (!raw || typeof raw !== 'object') return [];

    const chapters = filterChapters((raw as { chapters?: unknown }).chapters, findings);
    if (chapters.length > 0) {
      this.cache.setAny(fingerprint, raw);
      await this.cache.save();
    }
    return chapters;
  }

  private context(): AIContext {
    return {
      model: this.options.model,
      url: this.options.url,
      timeoutMs: this.options.timeoutMs,
    };
  }

  private fingerprint(kind: string, material: string): string {
    return crypto
      .createHash('sha256')
      .update(`${kind}|${material}|${this.options.model}`)
      .digest('hex');
  }
}

const NARRATE_SYSTEM_PROMPT = `You are a senior application-security consultant writing an audit report
for the team that owns this code. You translate technical scanner findings into clear English
that a product manager or junior developer can act on immediately.

Rules:
- Be specific to THIS finding; never invent files, routes, or facts not present in it.
- The attacker scenario must be concrete: who, what they do, what they get.
- Fix steps are ordered and concrete (name the actual function/middleware/config).
- Never include real secrets, tokens, or credentials.`;

function buildNarratePrompt(finding: Finding): string {
  const evidenceStr = JSON.stringify(finding.evidence, null, 2);
  return `Explain this security finding in plain language.

Title: ${finding.title}
Rule: ${finding.ruleId} (${finding.category}, severity: ${finding.severity})
Location: ${finding.location ?? 'unknown'}
What the scanner found: ${finding.message}
Current remediation hint: ${finding.remediation}
Evidence: ${evidenceStr.slice(0, 4000)}

Respond ONLY with JSON matching the schema: plainExplanation (what this issue is in simple words),
attackerScenario (a realistic attack story for this exact code), businessImpact (what the company loses),
fixSteps (ordered array of concrete steps).`;
}

const CHAPTERS_SYSTEM_PROMPT = `You are a senior application-security consultant structuring an audit report.
You group related findings into readable chapters so the report reads like a professional audit,
not a flat list. You never invent findings or drop any silently.`;
