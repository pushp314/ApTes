import { describe, it, expect } from 'vitest';
import { SarifReporter } from './reporters/sarif-reporter.js';
import type { UnifiedReport } from './orchestrator.js';
import type { Finding } from '@sentinel/shared';

describe('SARIF v2.1.0 Reporter', () => {
  it('should generate valid SARIF JSON with rules and results', () => {
    const finding: Finding = {
      id: 'find-1',
      projectId: 'proj-1',
      runId: 'run-1',
      engine: 'code',
      ruleId: 'no-sql-injection',
      category: 'injection',
      severity: 'critical',
      confidence: 'high',
      title: 'SQL Injection in user query',
      message: 'Unsanitized input concatenated into SQL string',
      location: 'src/db/users.ts:42',
      remediation: 'Use parameterized queries',
      evidence: { query: 'SELECT * FROM users' },
      timestamp: new Date().toISOString(),
    };

    const report: UnifiedReport = {
      projectId: 'proj-1',
      durationMs: 150,
      overallScore: 60,
      findings: [finding],
      errors: [],
    };

    const reporter = new SarifReporter();
    const sarifStr = reporter.generate(report);
    const sarif = JSON.parse(sarifStr);

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs.length).toBe(1);
    expect(sarif.runs[0].tool.driver.name).toBe('Sentinel');

    // Rule inspection
    const rules = sarif.runs[0].tool.driver.rules;
    expect(rules.length).toBe(1);
    expect(rules[0].id).toBe('no-sql-injection');

    // Results inspection
    const results = sarif.runs[0].results;
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('no-sql-injection');
    expect(results[0].level).toBe('error');
    expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/db/users.ts');
    expect(results[0].locations[0].physicalLocation.region.startLine).toBe(42);
  });
});
