import { describe, it, expect, vi } from 'vitest';
import { runUnifiedPlatform } from './orchestrator.js';

// Mock the engines to inject findings directly for the correlation test
vi.mock('@sentinel/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentinel/web')>();
  return {
    ...actual,
    runWebEngine: vi.fn().mockImplementation(async (url, rules, projectId, options) => {
      if (url === 'https://mock.correlation.test') {
        return {
          findings: [{
            id: 'web-1',
            projectId: 'test', runId: 'test', engine: 'web',
            ruleId: 'security-headers',
            category: 'config', severity: 'medium', confidence: 'high',
            title: 'Missing Security Headers', message: '', timestamp: ''
          }],
          error: undefined
        };
      }
      return actual.runWebEngine(url, rules, projectId, options);
    })
  };
});

vi.mock('@sentinel/codesentinel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentinel/codesentinel')>();
  return {
    ...actual,
    scan: vi.fn().mockImplementation(async (path) => {
      if (path === '/mock/path') {
        return {
          findings: [{
            id: 'code-1',
            projectId: 'test', runId: 'test', engine: 'code',
            ruleId: 'missing-auth',
            category: 'auth', severity: 'high', confidence: 'high',
            title: 'Missing Auth', message: '', timestamp: ''
          }],
          durationMs: 10
        };
      }
      return actual.scan(path, actual.createConfig({}));
    })
  };
});

vi.mock('@sentinel/recon', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentinel/recon')>();
  return {
    ...actual,
    runReconEngine: vi.fn().mockImplementation(async (target) => {
      if (target === 'mock.correlation.test') {
        return {
          findings: [{
            id: 'recon-1',
            projectId: 'test', runId: 'test', engine: 'recon',
            ruleId: 'recon-nmap-port-80',
            category: 'network', severity: 'info', confidence: 'high',
            title: 'Open Port', message: '', timestamp: '',
            evidence: { service: 'http' }
          }],
          durationMs: 10
        };
      }
      return { findings: [], durationMs: 10 };
    })
  };
});

describe('Unified Platform Orchestrator (SSRF Protections)', () => {
  it('should reject local/private IPs when allowLocalTargets is omitted (defaults to false)', async () => {
    const report = await runUnifiedPlatform({
      id: 'test-proj',
      webUrl: 'http://127.0.0.1:8080',
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: []
    });

    expect(report.errors.length).toBeGreaterThan(0);
    const webError = report.errors.find(e => e.includes('Web Engine Error'));
    expect(webError).toBeDefined();
    expect(webError).toContain('Targetting localhost');
  });
});

describe('Unified Platform Orchestrator (Authorization Gate)', () => {
  it('should refuse to scan when authorizationConfirmed is false', async () => {
    const report = await runUnifiedPlatform({
      id: 'test-proj',
      webUrl: 'https://example.com',
      authorizationConfirmed: false,
      mcpTargets: []
    });

    expect(report.errors.length).toBe(1);
    expect(report.errors[0]).toContain('explicit authorization confirmation with a valid timestamp is required');
  });
});

describe('Unified Platform Orchestrator (Correlation Logic)', () => {
  it('should generate a platform correlation finding when all three criteria are met', async () => {
    const report = await runUnifiedPlatform({
      id: 'test-proj',
      webUrl: 'https://mock.correlation.test',
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [],
      reconTargets: [
        {
          target: 'mock.correlation.test',
          authorizationConfirmed: true,
          authorizationConfirmedAt: new Date().toISOString()
        }
      ],
      codePath: '/mock/path'
    });

    // We expect 3 individual engine findings + 1 correlation finding
    const correlationFindings = report.findings.filter(f => f.ruleId === 'platform-exposed-service-no-auth');
    expect(correlationFindings.length).toBe(1);
    
    const finding = correlationFindings[0];
    if (!finding) throw new Error('Missing correlation finding');
    
    expect(finding.severity).toBe('critical');
    expect(finding.engine).toBe('platform');
    
    // Check that evidence holds references to the original findings
    const evidence: any = finding.evidence;
    expect(evidence.nmapFinding).toBe('recon-1');
    expect(evidence.webFinding).toBe('web-1');
    expect(evidence.codeFinding).toBe('code-1');
  });
});
