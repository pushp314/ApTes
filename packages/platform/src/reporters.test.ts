import { describe, it, expect } from 'vitest';
import type { Finding } from '@sentinel/shared';
import type { UnifiedReport } from './orchestrator.js';
import { JsonReporter, MarkdownReporter, HtmlReporter, CliReporter } from './reporters/index.js';

const mockReport: UnifiedReport = {
  projectId: 'test-project',
  durationMs: 1234,
  overallScore: 75,
  errors: ['Test error'],
  findings: [
    {
      id: 'f1',
      projectId: 'test-project',
      runId: 'r1',
      engine: 'web',
      ruleId: 'web-test-rule',
      category: 'test',
      severity: 'high',
      confidence: 'high',
      title: 'Web High Finding',
      message: 'This is a web high finding',
      location: 'http://localhost/test',
      timestamp: '2026-01-01T00:00:00Z',
    },
    {
      id: 'f2',
      projectId: 'test-project',
      runId: 'r1',
      engine: 'mcp',
      ruleId: 'mcp-test-rule',
      category: 'test',
      severity: 'critical',
      confidence: 'high',
      title: 'MCP Critical Finding',
      message: 'This is a critical MCP finding',
      location: 'mcp-target',
      remediation: 'Fix it now.',
      timestamp: '2026-01-01T00:00:00Z',
    },
    {
      id: 'f3',
      projectId: 'test-project',
      runId: 'r1',
      engine: 'platform',
      ruleId: 'platform-correlation',
      category: 'correlation',
      severity: 'critical',
      confidence: 'high',
      title: 'Platform Correlation',
      message: 'Correlated finding',
      location: 'platform',
      timestamp: '2026-01-01T00:00:00Z',
    } as unknown as Finding
  ]
} as UnifiedReport;

describe('Reporters', () => {
  it('JsonReporter generates valid JSON', () => {
    const reporter = new JsonReporter();
    const result = reporter.generate(mockReport);
    expect(result).toBeTypeOf('string');
    const parsed = JSON.parse(result);
    expect(parsed.projectId).toBe('test-project');
    expect(parsed.findings).toHaveLength(3);
  });

  it('MarkdownReporter generates expected sections', () => {
    const reporter = new MarkdownReporter();
    const result = reporter.generate(mockReport);
    expect(result).toContain('# Sentinel Unified Report');
    expect(result).toContain('## Errors');
    expect(result).toContain('❌ Test error');
    expect(result).toContain('### WEB Engine');
    expect(result).toContain('### MCP Engine');
    expect(result).toContain('### PLATFORM Engine');
    expect(result).toContain('🔴 critical');
    expect(result).toContain('🟠 high');
  });

  it('HtmlReporter generates expected sections', () => {
    const reporter = new HtmlReporter();
    const result = reporter.generate(mockReport);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('Sentinel Unified Report');
    expect(result).toContain('<div class="errors">');
    expect(result).toContain('<h2>WEB Engine</h2>');
    expect(result).toContain('<h2>MCP Engine</h2>');
    expect(result).toContain('<h2>PLATFORM Engine</h2>');
    expect(result).toContain('Fix it now.');
  });

  it('CliReporter generates expected layout', () => {
    const reporter = new CliReporter();
    const result = reporter.generate(mockReport);
    expect(result).toContain('SENTINEL UNIFIED REPORT');
    expect(result).toContain('[ERRORS]');
    expect(result).toContain('[ENGINE: WEB]');
    expect(result).toContain('[ENGINE: MCP]');
    expect(result).toContain('[ENGINE: PLATFORM]');
    expect(result).toContain('[CRITICAL]');
    expect(result).toContain('[HIGH    ]');
    expect(result).toContain('Fix: Fix it now.');
  });
});
