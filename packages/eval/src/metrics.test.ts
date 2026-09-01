import { describe, it, expect } from 'vitest';
import { calculateMetrics, GroundTruth } from './metrics.js';

describe('Evaluation Metrics', () => {
  const groundTruth: GroundTruth = {
    target: 'test',
    findings: [
      { id: '1', description: 'one', expectedCategory: 'a', expectedSeverity: 'high' },
      { id: '2', description: 'two', expectedCategory: 'b', expectedSeverity: 'high' }
    ]
  };

  const matchFn = (reported: any, truth: any) => reported.id === truth.id;

  it('calculates perfect metrics', () => {
    const reported = [
      { id: '1' },
      { id: '2' }
    ];
    const metrics = calculateMetrics(reported, groundTruth, matchFn);
    
    expect(metrics.truePositives).toBe(2);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1).toBe(1);
  });

  it('calculates with false positives', () => {
    const reported = [
      { id: '1' },
      { id: '2' },
      { id: '3' } // false positive
    ];
    const metrics = calculateMetrics(reported, groundTruth, matchFn);
    
    expect(metrics.truePositives).toBe(2);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.precision).toBeCloseTo(0.666);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1).toBeCloseTo(0.8);
  });

  it('calculates with false negatives', () => {
    const reported = [
      { id: '1' }
      // missing '2' (false negative)
    ];
    const metrics = calculateMetrics(reported, groundTruth, matchFn);
    
    expect(metrics.truePositives).toBe(1);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(0.5);
    expect(metrics.f1).toBeCloseTo(0.666);
  });
});
