/**
 * Guardrails for AI-generated report content.
 *
 * The platform-wide AI boundary (ARCHITECTURE.md §8) states that AI is
 * advisory-only: it may annotate findings but never alter deterministic
 * results. These helpers enforce that boundary mechanically.
 */

import type { AuditChapter, Finding, FindingNarrative } from '@sentinel/shared';

/** Maximum lengths to keep LLM verbosity from flooding reports. */
const LIMITS = {
  plainExplanation: 1200,
  attackerScenario: 1200,
  businessImpact: 800,
  fixSteps: 10,
  fixStepLength: 500,
  chapterTitle: 120,
  chapterIntro: 1500,
} as const;

function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed.slice(0, max);
}

/**
 * Validate and normalize a raw narrative object coming from an LLM.
 * Returns null when the payload is unusable — callers then leave the
 * finding untouched (deterministic output is never degraded).
 */
export function sanitizeNarrative(raw: unknown): FindingNarrative | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const plainExplanation = clampString(record.plainExplanation, LIMITS.plainExplanation);
  if (!plainExplanation) return null;

  const attackerScenario = clampString(record.attackerScenario, LIMITS.attackerScenario);
  const businessImpact = clampString(record.businessImpact, LIMITS.businessImpact);

  let fixSteps: string[] = [];
  if (Array.isArray(record.fixSteps)) {
    fixSteps = record.fixSteps
      .map(step => clampString(step, LIMITS.fixStepLength))
      .filter((step): step is string => Boolean(step))
      .slice(0, LIMITS.fixSteps);
  }

  // A narrative without any actionable content is not worth showing.
  if (!attackerScenario && !businessImpact && fixSteps.length === 0) return null;

  return {
    plainExplanation,
    attackerScenario: attackerScenario ?? '',
    businessImpact: businessImpact ?? '',
    fixSteps,
  };
}

/**
 * Keep only chapters whose finding IDs reference real findings, drop empty
 * chapters, and cap title/intro length. Guarantees the AI cannot invent
 * findings or reference ones it was not shown.
 */
export function filterChapters(
  rawChapters: unknown,
  findings: Finding[]
): AuditChapter[] {
  if (!Array.isArray(rawChapters)) return [];

  const validIds = new Set(findings.map(f => f.id));
  const usedIds = new Set<string>();
  const chapters: AuditChapter[] = [];

  for (const raw of rawChapters) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;

    const title = clampString(record.title, LIMITS.chapterTitle);
    const intro = clampString(record.intro, LIMITS.chapterIntro);
    if (!title) continue;

    const findingIds = Array.isArray(record.findingIds)
      ? record.findingIds.filter(
          (id): id is string => typeof id === 'string' && validIds.has(id) && !usedIds.has(id)
        )
      : [];

    // A chapter that references no real findings is hallucinated structure
    // (however fluent its prose) and must not reach the report.
    if (findingIds.length === 0) continue;

    for (const id of findingIds) usedIds.add(id);
    chapters.push({ title, intro: intro ?? '', findingIds });
  }

  return chapters;
}

/**
 * Deterministic fallback grouping when no LLM is available: group by
 * category so every report still has readable structure.
 */
export function deterministicChapters(findings: Finding[]): AuditChapter[] {
  const byCategory = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = byCategory.get(finding.category) ?? [];
    list.push(finding);
    byCategory.set(finding.category, list);
  }

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  return Array.from(byCategory.entries())
    .sort((a, b) => {
      const worstA = Math.min(...a[1].map(f => severityOrder[f.severity] ?? 5));
      const worstB = Math.min(...b[1].map(f => severityOrder[f.severity] ?? 5));
      return worstA - worstB || b[1].length - a[1].length;
    })
    .map(([category, group]) => ({
      title: `${category} (${group.length} finding${group.length === 1 ? '' : 's'})`,
      intro: '',
      findingIds: group.map(f => f.id),
    }));
}
