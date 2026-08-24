import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from './policy.js';
import type { UnifiedReport } from './orchestrator.js';
import type { Finding } from '@sentinel/shared';

function createMockFinding(id: string, severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): Finding {
  return {
    id,
    projectId: 'test-p',
    runId: 'test-r',
    engine: 'web',
    ruleId: `rule-${severity}`,
    category: 'security',
    severity,
    confidence: 'high',
    title: `Mock ${severity} finding`,
    message: `Test message for ${severity}`,
    remediation: 'Fix it',
    evidence: {},
    timestamp: new Date().toISOString(),
  };
}

describe('Security Policy Evaluation', () => {
  it('should pass when report has no findings', () => {
    const report: UnifiedReport = {
      projectId: 'test',
      durationMs: 100,
      overallScore: 100,
      findings: [],
      errors: [],
    };

    const result = evaluatePolicy(report, { failOn: 'high' });
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('should fail when a finding exceeds the failOn severity threshold', () => {
    const report: UnifiedReport = {
      projectId: 'test',
      durationMs: 100,
      overallScore: 70,
      findings: [createMockFinding('f1', 'high')],
      errors: [],
    };

    const result = evaluatePolicy(report, { failOn: 'high' });
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toContain("Policy threshold 'high' exceeded");
  });

  it('should pass when findings are below the failOn severity threshold', () => {
    const report: UnifiedReport = {
      projectId: 'test',
      durationMs: 100,
      overallScore: 85,
      findings: [createMockFinding('f1', 'low'), createMockFinding('f2', 'medium')],
      errors: [],
    };

    const result = evaluatePolicy(report, { failOn: 'high' });
    expect(result.passed).toBe(true);
  });

  it('should fail when maxCritical threshold is exceeded', () => {
    const report: UnifiedReport = {
      projectId: 'test',
      durationMs: 100,
      overallScore: 50,
      findings: [createMockFinding('f1', 'critical')],
      errors: [],
    };

    const result = evaluatePolicy(report, { maxCritical: 0 });
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toContain('Found 1 CRITICAL findings');
  });

  it('should fail when minScore threshold is not met', () => {
    const report: UnifiedReport = {
      projectId: 'test',
      durationMs: 100,
      overallScore: 75,
      findings: [],
      errors: [],
    };

    const result = evaluatePolicy(report, { minScore: 90 });
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toContain('below required minimum of 90/100');
  });
});
