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
    timestamp: '2026-01-01'
  },
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
    timestamp: '2026-01-01'
  }
];

describe('AiReviewer', () => {
  it('does nothing when disabled', async () => {
    const reviewer = new AiReviewer({ enabled: false });
    const result = await reviewer.review(mockFindings);
    
    expect(result).toHaveLength(2);
    expect(result[0].message).toBe('Original message');
    expect(result[1].message).toBe('Original message');
    expect(result[1].evidence?.aiReviewed).toBeUndefined();
  });

  it('only processes low-confidence findings when enabled', async () => {
    const reviewer = new AiReviewer({ enabled: true, provider: 'mock' });
    const result = await reviewer.review(mockFindings);
    
    expect(result).toHaveLength(2);
    
    // High confidence finding remains untouched
    expect(result[0].confidence).toBe('high');
    expect(result[0].message).toBe('Original message');
    expect(result[0].evidence?.aiReviewed).toBeUndefined();

    // Low confidence finding gets reviewed
    expect(result[1].confidence).toBe('low');
    expect(result[1].message).toContain('[AI Reviewed]');
    expect(result[1].evidence?.aiReviewed).toBe(true);
    expect(result[1].evidence?.aiModel).toBe('llama3');
  });
});
