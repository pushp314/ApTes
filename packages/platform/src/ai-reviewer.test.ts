import { describe, it, expect } from 'vitest';
import { AiReviewer } from './ai-reviewer.js';
import type { Finding } from '@sentinel/shared';

const mockFindings: Finding[] = [
  {
    id: 'f1',
    projectId: 'test',
    runId: 'r1',
    engine: 'web',
    ruleId: 'r1',
    category: 'test',
    severity: 'critical',
    confidence: 'high',
    title: 'High Confidence Issue',
    message: 'Original message',
    location: 'loc',
    evidence: {},
    timestamp: '2026-01-01'
  } as Finding,
  {
    id: 'f2',
    projectId: 'test',
    runId: 'r1',
    engine: 'web',
    ruleId: 'r2',
    category: 'test',
    severity: 'low',
    confidence: 'low',
    title: 'Low Confidence Issue',
    message: 'Original message',
    location: 'loc',
    evidence: {},
    timestamp: '2026-01-01'
  } as Finding,
  {
    id: 'f3',
    projectId: 'test',
    runId: 'r1',
    engine: 'web',
    ruleId: 'r3',
    category: 'test',
    severity: 'low',
    confidence: 'low',
    title: 'Another Low Confidence Issue',
    message: 'Original message',
    location: 'loc',
    evidence: {},
    timestamp: '2026-01-01'
  } as Finding
];

describe('AiReviewer', () => {
  it('does nothing when disabled', async () => {
    const reviewer = new AiReviewer({ enabled: false, projectId: 'test' });
    const result = await reviewer.review(mockFindings);
    
    expect(result).toHaveLength(3);
    expect(result[1]!.aiAssessment).toBeUndefined();
  });

  it('does nothing when budget is 0', async () => {
    const reviewer = new AiReviewer({ enabled: true, budget: 0, provider: 'mock', projectId: 'test' });
    const result = await reviewer.review(mockFindings);
    
    expect(result).toHaveLength(3);
    expect(result[1]!.aiAssessment).toBeUndefined();
  });

  it('only processes low-confidence findings when enabled and budget > 0', async () => {
    const findings = JSON.parse(JSON.stringify(mockFindings)) as Finding[];
    const reviewer = new AiReviewer({ enabled: true, budget: 5, provider: 'mock', projectId: 'test' });
    const result = await reviewer.review(findings);
    
    expect(result).toHaveLength(3);
    
    // High confidence finding remains untouched
    expect(result[0]!.confidence).toBe('high');
    expect(result[0]!.aiAssessment).toBeUndefined();

    // Low confidence findings get reviewed
    expect(result[1]!.confidence).toBe('low');
    expect(result[1]!.aiAssessment).toBeDefined();
    expect(result[1]!.aiAssessment?.verdict).toBe('likely');
    
    expect(result[2]!.confidence).toBe('low');
    expect(result[2]!.aiAssessment).toBeDefined();
  });

  it('enforces budget strictly by stopping AI requests once exhausted', async () => {
    // Both f2 and f3 are low confidence, but if batch size was 1 (in real code it is 10) 
    // Here budget is per batch. Because batchSize=10, 2 findings fit in 1 batch.
    // If budget is 1, they both get analyzed because they are in the same batch.
    
    // Let's test a scenario where we force budget limits:
    const reviewer = new AiReviewer({ enabled: true, budget: 10, provider: 'mock', projectId: 'test', inMemoryCache: true });
    
    // Since batch size is 10, if we pass 20 findings, it takes 2 batches.
    const baseFinding = JSON.parse(JSON.stringify(mockFindings[1]));
    delete baseFinding.aiAssessment;

    const manyFindings = Array(20).fill(0).map((_, i) => ({
      ...baseFinding,
      id: `f-${i}`,
      ruleId: `r-diff-${i}` // Ensure cache miss
    })) as Finding[];

    const result = await reviewer.review(manyFindings);
    
    // Budget = 1 means only 1 batch (10 items) gets AI assessment.
    const analyzed = result.filter(f => f.aiAssessment !== undefined);
    const unanalyzed = result.filter(f => f.aiAssessment === undefined);
    
    expect(analyzed).toHaveLength(10);
    expect(unanalyzed).toHaveLength(10);
  });
});
