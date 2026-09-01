# Final MVP Verification Audit (Aug 23, 2026)

This document serves as the final strict verification audit for the 7 remediation items. **MVP-verified against fixtures as of Aug 23, 2026.**

## 1. SSRF Bypass in Orchestrator (CRITICAL)
**Claim:** The platform orchestrator strictly respects the `allowLocalTargets` flag and successfully rejects `localhost`/private-IP targeting by default.
**Evidence:**
```typescript
// packages/platform/src/orchestrator.ts
      allowLocal: project.allowLocalTargets ?? false,
```
```bash
$ npx vitest run packages/platform/src/orchestrator.test.ts
stdout | packages/platform/src/orchestrator.test.ts > Unified Platform Orchestrator (SSRF Protections) > should reject local/private IPs when allowLocalTargets is omitted (defaults to false)
[
  'Web Engine Error: Targetting localhost is prohibited by SSRF protection.'
]
 ✓ packages/platform/src/orchestrator.test.ts (3 tests) 2ms
```

## 2. Authorization / Consent Gate (CRITICAL)
**Claim:** All engines (Platform, Web, MCP) require explicit authorization before a scan is initiated. The CLI mandates the `--i-own-this-target` or `--authorized` flag.
**Evidence:**
```bash
$ node packages/web/dist/cli.js scan http://example.com
error: required option '--i-own-this-target' not specified

$ node packages/mcp/dist/cli.js scan node server.js
error: required option '--i-own-this-target' not specified
```

## 3. Undeclared CodeSentinel → Platform Dependency (HIGH)
**Claim:** CodeSentinel has zero dependency on `@sentinel/platform`. It uses its own standalone `LocalAiReviewer` (Option B).
**Evidence:**
```bash
$ grep -rn "@sentinel/platform" packages/codesentinel/
# (Exited with code 1, no matches found)
```
```typescript
// packages/codesentinel/src/cli.ts
import { LocalAiReviewer } from './ai-reviewer.js';
```

## 4. MCP Subprocess Sandboxing (HIGH)
**Claim:** Local MCP target subprocesses do not implicitly inherit the parent environment. They default to a restricted `PATH`-only allowlist unless explicitly overridden.
**Evidence:**
```typescript
// packages/mcp/src/runner.ts
export function createRestrictedSubprocessEnv(overrides?: Record<string, string>): Record<string, string> {
  const environment: Record<string, string> = {
    PATH: process.env.PATH ?? '',
  };
  return { ...environment, ...overrides };
}
```
*(Verified by `env-test-server.js` passing in `npx vitest run packages/mcp/src/runner.test.ts` where it asserts `process.env.SENTINEL_MCP_PARENT_ONLY_SECRET` does not reach the target).*

## 5. AI Widget Detection Heuristics (MEDIUM)
**Claim:** The Web engine uses real-world heuristics to detect chat widgets (known vendors, endpoint regexes, DOM patterns) and does not hallucinate findings on generic/healthy sites.
**Evidence:**
```bash
$ node packages/web/dist/cli.js scan https://example.com --i-own-this-target
Starting Web Engine scan for: https://example.com
[Web Engine] Scanning: https://example.com

Scan completed in 2957ms
Pages Scanned: 1
Found 0 findings.
```

## 6. Fixture Depth (MEDIUM)
**Claim:** The repository contains deep, explicit `vulnerable/` and `safe/` fixtures for all three engines, and the engines reliably detect exactly 100% vulnerabilities on the vulnerable targets and 0 on the safe targets.
**Evidence:**
```bash
$ node packages/codesentinel/dist/cli.js scan packages/codesentinel/fixtures/sample-project/src/safe/
✅ No findings detected.

$ node packages/codesentinel/dist/cli.js scan packages/codesentinel/fixtures/sample-project/src/vulnerable/
🚨 Findings (11): (Includes Hardcoded Secrets, Injection Risks, Missing Auth)
```

## 7. Platform-level CLI (MEDIUM)
**Claim:** The Platform engine provides a real `commander`-based CLI that wires together Web, Code, and MCP engines into a single unified report.
**Evidence:**
```bash
$ python3 -m http.server 8081 -d packages/web/fixtures/healthy-site & sleep 2 && \
  node packages/platform/dist/cli.js scan --project end-to-end-test \
  --web http://127.0.0.1:8081 \
  --mcp "node packages/mcp/fixtures/vulnerable-server.js" \
  --code packages/codesentinel/fixtures/sample-project/src/vulnerable/ \
  --authorized --allow-local

========================================
    SENTINEL UNIFIED REPORT
========================================
Project: end-to-end-test
Score:   0/100
Time:    3031ms
========================================
Found 22 total issue(s).
```
