import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runWebEngine } from './runner.js';
import { ConsoleErrorsRule } from './rules/console-errors.js';
import { FailedRequestsRule } from './rules/failed-requests.js';
import { FormsRule } from './rules/forms.js';
import { PageStructureRule } from './rules/page-structure.js';
import { PerformanceRule } from './rules/performance.js';
import { SecurityHeadersRule } from './rules/security-headers.js';
import { CookieSecurityRule } from './rules/cookie-security.js';
import { MixedContentRule } from './rules/mixed-content.js';
import { startTestServer, stopTestServer } from './test-server.js';
import type * as http from 'node:http';

describe('Web Engine Runner', () => {
  let server: http.Server;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer(server);
  });

  it('runs rules, crawls links, and collects findings against the test server', async () => {
    const rules = [
      ConsoleErrorsRule, 
      FailedRequestsRule, 
      FormsRule, 
      PageStructureRule, 
      PerformanceRule,
      SecurityHeadersRule,
      CookieSecurityRule,
      MixedContentRule
    ];
    const targetUrl = 'http://127.0.0.1:3456';
    
    // We MUST pass allowLocal: true since we're testing against localhost
    const result = await runWebEngine(targetUrl, rules, 'test-project', {
      allowLocal: true,
      scanTimeoutMs: 15000,
      maxPages: 2, // Allow it to crawl to /page2
    });

    expect(result.error).toBeUndefined();
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.pagesScanned).toBe(2); // Should have scanned / and /page2
    
    const findings = result.findings;
    
    // Check QA rules from Phase 9 (from Page 1)
    const hasConsoleError = findings.some(f => 
      f.ruleId === 'web-console-errors' && 
      f.category === 'runtime-error' &&
      f.message.includes('deliberate console error')
    );
    expect(hasConsoleError).toBe(true);

    const hasExceptionError = findings.some(f => 
      f.ruleId === 'web-console-errors' && 
      f.category === 'uncaught-exception' &&
      f.message.includes('deliberate uncaught exception')
    );
    expect(hasExceptionError).toBe(true);

    const notFoundError = findings.find(f => f.ruleId === 'web-failed-requests' && f.category === 'client-error');
    expect(notFoundError).toBeDefined();
    expect(notFoundError?.location).toContain('does-not-exist.js');
    expect(notFoundError?.message).toContain('status 404');

    const serverError = findings.find(f => f.ruleId === 'web-failed-requests' && f.category === 'server-error');
    expect(serverError).toBeDefined();
    expect(serverError?.location).toContain('server-error-image.png');
    expect(serverError?.message).toContain('status 500');

    // Check Functional rules from Phase 10 (from Page 2)
    const missingTitle = findings.find(f => f.ruleId === 'web-page-structure' && f.evidence.issueType === 'missing-title');
    expect(missingTitle).toBeDefined();
    expect(missingTitle?.location).toContain('/page2');

    const missingH1 = findings.find(f => f.ruleId === 'web-page-structure' && f.evidence.issueType === 'missing-h1');
    expect(missingH1).toBeDefined();
    expect(missingH1?.location).toContain('/page2');

    const missingAction = findings.find(f => f.ruleId === 'web-forms' && f.evidence.issueType === 'missing-action');
    expect(missingAction).toBeDefined();

    const missingSubmit = findings.find(f => f.ruleId === 'web-forms' && f.evidence.issueType === 'missing-submit');
    expect(missingSubmit).toBeDefined();

    const unnamedInputs = findings.filter(f => f.ruleId === 'web-forms' && f.evidence.issueType === 'unnamed-input');
    expect(unnamedInputs.length).toBe(2); // One for text, one for password

    // Check Security rules from Phase 11
    const missingCSP = findings.find(f => f.ruleId === 'web-security-headers' && f.title === 'Missing Content-Security-Policy');
    expect(missingCSP).toBeDefined();

    const missingXFrame = findings.find(f => f.ruleId === 'web-security-headers' && f.title === 'Missing Clickjacking Protection');
    expect(missingXFrame).toBeDefined();

    const insecureCookie = findings.find(f => f.ruleId === 'web-cookie-security' && f.message.includes('insecure_session'));
    expect(insecureCookie).toBeDefined();
    expect(insecureCookie?.message).toContain('Missing HttpOnly');
  }, 15000);

  it('fails safely if SSRF protection triggers', async () => {
    const rules = [ConsoleErrorsRule];
    const targetUrl = 'http://127.0.0.1:3456';
    
    // allowLocal is false by default, so it should block
    const result = await runWebEngine(targetUrl, rules, 'test-project');

    expect(result.error).toBeDefined();
    expect(result.error).toContain('SSRF');
    expect(result.findings).toHaveLength(0);
    expect(result.pagesScanned).toBe(0);
  });
});
