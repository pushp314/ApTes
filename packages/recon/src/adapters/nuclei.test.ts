import { describe, it, expect } from 'vitest';
import { NucleiAdapter } from './nuclei.js';

describe('NucleiAdapter', () => {
  it('parses valid JSON lines output correctly', () => {
    const stdout = `
{"id":"cve-2023-1234","info":{"name":"Test CVE","severity":"high","description":"A bad thing","remediation":"Fix it"},"host":"example.com","matched-at":"https://example.com/api","timestamp":"2023-01-01T00:00:00Z"}
{"id":"misconfig-1","info":{"name":"Exposed Config","severity":"low"},"host":"example.com"}
    `.trim();

    const findings = NucleiAdapter.parse({
      stdout,
      stderr: '',
      exitCode: 0,
      durationMs: 100
    }, 'test-project', 'test-run');

    expect(findings.length).toBe(2);
    
    expect(findings[0].severity).toBe('high');
    expect(findings[0].ruleId).toBe('recon-nuclei-cve-2023-1234');
    expect(findings[0].title).toBe('Test CVE');
    expect(findings[0].message).toBe('A bad thing');
    expect(findings[0].remediation).toBe('Fix it');
    expect(findings[0].engine).toBe('recon');

    expect(findings[1].severity).toBe('low');
    expect(findings[1].ruleId).toBe('recon-nuclei-misconfig-1');
  });

  it('ignores invalid JSON or non-finding lines', () => {
    const stdout = `
{"invalid":"json"
{"id":"no-severity","info":{"name":"Missing Severity"}}
{"id":"valid","info":{"name":"Valid","severity":"critical"}}
    `.trim();

    const findings = NucleiAdapter.parse({
      stdout,
      stderr: '',
      exitCode: 0,
      durationMs: 100
    }, 'test-project', 'test-run');

    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].title).toBe('Valid');
  });
});
