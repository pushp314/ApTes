import type { AIProvider, AIContext, AIAnalysis } from './provider.js';
import type { Finding } from '@sentinel/shared';

/**
 * Deterministic mock provider for testing the full AI pipeline
 * (triage, narration, chapters) without a running Ollama instance.
 */
export class MockProvider implements AIProvider {
  async analyzeFindings(findings: Finding[], _context?: AIContext): Promise<AIAnalysis[]> {
    return findings.map(f => ({
      findingId: f.id,
      assessment: {
        verdict: 'likely',
        confidence: 0.85,
        reason: 'Mock AI assessment determined this is likely an issue.',
        remediation: 'Review the mock output.',
      }
    }));
  }

  async generateStructured(
    system: string,
    user: string,
    schema: Record<string, unknown>
  ): Promise<unknown | null> {
    void system;
    const shape = JSON.stringify(schema);
    if (shape.includes('plainExplanation')) {
      return {
        plainExplanation: 'Mock explanation of the finding.',
        attackerScenario: 'Mock attacker scenario.',
        businessImpact: 'Mock business impact.',
        fixSteps: ['Step one', 'Step two'],
      };
    }
    return {
      chapters: [
        { title: 'Authentication gaps', intro: 'Mock chapter intro.', findingIds: extractIds(user) },
        { title: 'Invalid references', intro: 'Should be filtered.', findingIds: ['fake-id-1', 'fake-id-2'] },
      ],
    };
  }
}

function extractIds(userPrompt: string): string[] {
  const matches = userPrompt.match(/"id":\s*"([^"]+)"/g) ?? [];
  return matches
    .map(m => m.split('"')[3])
    .filter((id): id is string => Boolean(id));
}
