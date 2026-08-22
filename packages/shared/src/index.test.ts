import { describe, it, expect } from 'vitest';
import {
  VERSION,
  SEVERITIES,
  CONFIDENCES,
  ENGINE_TYPES,
  isSeverity,
  isConfidence,
  isEngineType,
} from './index.js';
import type {
  Finding,
  EngineRule,
  EngineContext,
} from './index.js';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

describe('VERSION', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0');
    expect(typeof VERSION).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

describe('Severity', () => {
  it('defines five severity levels in order', () => {
    expect(SEVERITIES).toEqual(['critical', 'high', 'medium', 'low', 'info']);
    expect(SEVERITIES).toHaveLength(5);
  });

  it('validates valid severity values', () => {
    for (const s of SEVERITIES) {
      expect(isSeverity(s)).toBe(true);
    }
  });

  it('rejects invalid severity values', () => {
    expect(isSeverity('extreme')).toBe(false);
    expect(isSeverity('')).toBe(false);
    expect(isSeverity('HIGH')).toBe(false);
    expect(isSeverity('Critical')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

describe('Confidence', () => {
  it('defines two confidence levels', () => {
    expect(CONFIDENCES).toEqual(['high', 'low']);
    expect(CONFIDENCES).toHaveLength(2);
  });

  it('validates valid confidence values', () => {
    for (const c of CONFIDENCES) {
      expect(isConfidence(c)).toBe(true);
    }
  });

  it('rejects invalid confidence values', () => {
    expect(isConfidence('medium')).toBe(false);
    expect(isConfidence('')).toBe(false);
    expect(isConfidence('HIGH')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EngineType
// ---------------------------------------------------------------------------

describe('EngineType', () => {
  it('defines four engine types', () => {
    expect(ENGINE_TYPES).toEqual(['web', 'mcp', 'code', 'platform']);
    expect(ENGINE_TYPES).toHaveLength(4);
  });

  it('validates valid engine type values', () => {
    for (const e of ENGINE_TYPES) {
      expect(isEngineType(e)).toBe(true);
    }
  });

  it('rejects invalid engine type values', () => {
    expect(isEngineType('api')).toBe(false);
    expect(isEngineType('')).toBe(false);
    expect(isEngineType('WEB')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Finding (compile-time type checks)
// ---------------------------------------------------------------------------

describe('Finding interface', () => {
  it('accepts a valid web finding', () => {
    const finding: Finding = {
      id: 'f-001',
      projectId: 'proj-1',
      runId: 'run-1',
      engine: 'web',
      ruleId: 'api-500-error',
      category: 'api-errors',
      severity: 'high',
      confidence: 'high',
      title: 'API returned HTTP 500',
      message: 'The /api/checkout endpoint returned HTTP 500 during testing.',
      location: 'https://example.com/api/checkout',
      evidence: { endpoint: '/api/checkout', status: 500 },
      remediation: 'Investigate server error on /api/checkout.',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    expect(finding.engine).toBe('web');
    expect(finding.runId).toBe('run-1');
  });

  it('accepts a code finding with null runId', () => {
    const finding: Finding = {
      id: 'f-002',
      projectId: 'proj-1',
      runId: null,
      engine: 'code',
      ruleId: 'unhandled-promise',
      category: 'bugs',
      severity: 'medium',
      confidence: 'high',
      title: 'Unhandled promise rejection',
      message: 'fetch() call on line 42 has no .catch() or try/catch.',
      location: 'src/api/client.ts:42',
      evidence: { file: 'src/api/client.ts', line: 42 },
      remediation: 'Add error handling for the fetch() call.',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    expect(finding.engine).toBe('code');
    expect(finding.runId).toBeNull();
  });

  it('accepts an MCP finding with relatedFindingId', () => {
    const finding: Finding = {
      id: 'f-003',
      projectId: 'proj-1',
      runId: 'run-2',
      engine: 'mcp',
      ruleId: 'unbounded-params',
      category: 'schema-rigor',
      severity: 'high',
      confidence: 'high',
      title: 'Unbounded parameter in tool schema',
      message: 'Tool "execute_command" accepts arbitrary string input.',
      location: 'execute_command',
      evidence: { tool: 'execute_command', param: 'command', type: 'string' },
      remediation: 'Add maxLength and pattern constraints.',
      relatedFindingId: 'f-001',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    expect(finding.engine).toBe('mcp');
    expect(finding.relatedFindingId).toBe('f-001');
  });

  it('accepts a finding without optional fields', () => {
    const finding: Finding = {
      id: 'f-004',
      projectId: 'proj-1',
      runId: 'run-1',
      engine: 'web',
      ruleId: 'missing-csp',
      category: 'security-headers',
      severity: 'medium',
      confidence: 'high',
      title: 'Missing Content-Security-Policy header',
      message: 'No Content-Security-Policy header detected.',
      evidence: {},
      remediation: 'Add a Content-Security-Policy header.',
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    // location and relatedFindingId are optional
    expect(finding.location).toBeUndefined();
    expect(finding.relatedFindingId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// EngineRule (compile-time type checks)
// ---------------------------------------------------------------------------

describe('EngineRule interface', () => {
  it('accepts a synchronous web rule implementation', () => {
    const rule: EngineRule = {
      id: 'test-rule',
      name: 'Test Rule',
      engineType: 'web',
      category: 'test',
      severity: 'info',
      confidence: 'high',
      evaluate: (_context: EngineContext): Finding[] => [],
    };
    expect(rule.engineType).toBe('web');
    expect(rule.evaluate({
      runId: 'run-1',
      engineType: 'web',
      projectId: 'proj-1',
    })).toEqual([]);
  });

  it('accepts an async MCP rule implementation', async () => {
    const rule: EngineRule = {
      id: 'async-rule',
      name: 'Async Rule',
      engineType: 'mcp',
      category: 'schema-rigor',
      severity: 'high',
      confidence: 'high',
      evaluate: async (_context: EngineContext): Promise<Finding[]> => [],
    };
    expect(rule.engineType).toBe('mcp');
    const findings = await rule.evaluate({
      runId: 'run-1',
      engineType: 'mcp',
      projectId: 'proj-1',
    });
    expect(findings).toEqual([]);
  });
});
