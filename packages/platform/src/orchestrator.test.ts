import { describe, it, expect } from 'vitest';
import { runUnifiedPlatform } from './orchestrator.js';

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
  
  it('should refuse to scan when MCP target lacks authorization', async () => {
    const report = await runUnifiedPlatform({
      id: 'test-proj',
      webUrl: 'https://example.com',
      authorizationConfirmed: true,
      authorizationConfirmedAt: new Date().toISOString(),
      mcpTargets: [{
        command: 'node',
        args: ['server.js'],
        authorizationConfirmed: false,
        authorizationConfirmedAt: ''
      }]
    });

    expect(report.errors.length).toBe(1);
    expect(report.errors[0]).toContain('MCP scan refused');
  });
});
