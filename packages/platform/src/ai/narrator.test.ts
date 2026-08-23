import { describe, it, expect } from 'vitest';
import { NarrativeEngine } from './narrator.js';
import { MockProvider } from './mock-provider.js';
import { AICache } from './cache.js';
import { sanitizeNarrative, filterChapters, deterministicChapters } from './guardrails.js';
import type { Finding } from '@sentinel/shared';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: `finding-${Math.random().toString(36).slice(2, 8)}`,
    projectId: 'test',
    runId: null,
    engine: 'code',
    ruleId: 'missing-auth',
    category: 'security',
    severity: 'high',
    confidence: 'high',
    title: 'Sensitive route without auth',
    message: "Route '/admin' lacks middleware.",
    location: 'src/app.ts:10',
    evidence: {},
    remediation: 'Add authMiddleware.',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

async function makeCache(): Promise<AICache> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'narrator-test-'));
  return new AICache(dir);
}

describe('NarrativeEngine', () => {
  it('attaches sanitized narratives to findings', async () => {
    const cache = await makeCache();
    const engine = new NarrativeEngine(new MockProvider(), cache, { budget: 5 });
    const findings = [makeFinding(), makeFinding()];

    const narrated = await engine.narrate(findings);

    expect(narrated).toBe(2);
    for (const finding of findings) {
      expect(finding.narrative?.plainExplanation).toBe('Mock explanation of the finding.');
      expect(finding.narrative?.fixSteps).toEqual(['Step one', 'Step two']);
    }
  });

  it('respects the narration budget', async () => {
    const cache = await makeCache();
    const engine = new NarrativeEngine(new MockProvider(), cache, { budget: 1 });
    const findings = [
      makeFinding({ severity: 'critical' }),
      makeFinding({ severity: 'medium' }),
      makeFinding({ severity: 'low' }),
    ];

    const narrated = await engine.narrate(findings);

    expect(narrated).toBe(1);
    // The critical finding has priority
    expect(findings[0]?.narrative).toBeDefined();
    expect(findings[1]?.narrative).toBeUndefined();
  });

  it('never mutates deterministic fields (advisory-only boundary)', async () => {
    const cache = await makeCache();
    const engine = new NarrativeEngine(new MockProvider(), cache, { budget: 3 });
    const finding = makeFinding();
    const before = {
      severity: finding.severity,
      confidence: finding.confidence,
      message: finding.message,
      ruleId: finding.ruleId,
    };

    await engine.narrate([finding]);

    expect(finding.severity).toBe(before.severity);
    expect(finding.confidence).toBe(before.confidence);
    expect(finding.message).toBe(before.message);
    expect(finding.ruleId).toBe(before.ruleId);
  });

  it('chapterizes with guardrail filtering of invented IDs', async () => {
    const cache = await makeCache();
    const engine = new NarrativeEngine(new MockProvider(), cache, { budget: 2 });
    const findings = [makeFinding(), makeFinding(), makeFinding()];

    const chapters = await engine.chapterize(findings);

    // The mock returns a chapter referencing fake-id-1/fake-id-2 — must be dropped
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.title).toBe('Authentication gaps');
    expect(chapters[0]?.findingIds.length).toBeGreaterThan(0);
    for (const id of chapters[0]?.findingIds ?? []) {
      expect(findings.some(f => f.id === id)).toBe(true);
    }
  });

  it('skips chapterize when fewer than 3 findings', async () => {
    const cache = await makeCache();
    const engine = new NarrativeEngine(new MockProvider(), cache, { budget: 2 });

    expect(await engine.chapterize([makeFinding()])).toEqual([]);
  });
});

describe('guardrails', () => {
  it('sanitizeNarrative rejects unusable payloads', () => {
    expect(sanitizeNarrative(null)).toBeNull();
    expect(sanitizeNarrative({})).toBeNull();
    expect(
      sanitizeNarrative({ plainExplanation: '', attackerScenario: '', businessImpact: '' })
    ).toBeNull();
  });

  it('sanitizeNarrative clamps runaway LLM output', () => {
    const narrative = sanitizeNarrative({
      plainExplanation: 'x'.repeat(5000),
      fixSteps: Array.from({ length: 50 }, (_, i) => `step ${i}`),
    });

    expect(narrative).not.toBeNull();
    expect(narrative!.plainExplanation.length).toBeLessThanOrEqual(1200);
    expect(narrative!.fixSteps.length).toBeLessThanOrEqual(10);
  });

  it('filterChapters drops unknown finding IDs and empty chapters', () => {
    const f1 = makeFinding();
    const chapters = filterChapters(
      [
        { title: 'Real', intro: 'ok', findingIds: [f1.id] },
        { title: 'Invented', intro: '', findingIds: ['nope'] },
        { title: '', intro: 'no title', findingIds: [f1.id] },
      ],
      [f1]
    );

    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.title).toBe('Real');
  });

  it('deterministicChapters groups by category ordered by worst severity', () => {
    const critical = makeFinding({ category: 'injection', severity: 'critical' });
    const low = makeFinding({ category: 'style', severity: 'low' });
    const high = makeFinding({ category: 'auth', severity: 'high' });

    const chapters = deterministicChapters([low, high, critical]);

    expect(chapters).toHaveLength(3);
    expect(chapters[0]?.findingIds).toContain(critical.id);
    expect(chapters.every(c => typeof c.title === 'string' && c.title.length > 0)).toBe(true);
  });
});
