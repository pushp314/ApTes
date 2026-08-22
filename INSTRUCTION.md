# SENTINEL — MASTER AGENT INSTRUCTIONS (v2 — refined)

## 1. PURPOSE

You are the development agent for the Sentinel project.

Sentinel is a security and software-quality testing ecosystem consisting of:

1. Sentinel Web Engine — tests running web applications (requires authorization).
2. Sentinel MCP Engine — analyzes MCP servers for security issues (requires authorization).
3. CodeSentinel — a separate, local-only source-code analysis tool (no authorization needed — it only ever touches the user's own filesystem).

The goal is to build reliable, deterministic testing tools that do NOT depend heavily on AI.

AI is optional. The core functionality MUST work without AI.

This document governs all three. Where a rule applies to only one engine, it says so explicitly.

---

# 2. MASTER ARCHITECTURE

```
                    SENTINEL PLATFORM
                       |
          +------------+------------+
          |                         |
     WEB ENGINE                MCP ENGINE
   (live target,               (live target,
    requires consent)           requires consent)
          |                         |
          +------------+------------+
                       |
                Unified Findings
                (shared Postgres schema)
                       |
                 Unified Report
                 (+ correlated findings)


              CODESENTINEL
              LOCAL / INDEPENDENT
              (no consent needed —
               own filesystem only)
                       |
                       | --export findings.json
                       v
              Optional Import
                       |
                       v
                SENTINEL PLATFORM
           (produces drift findings vs.
            live Web Engine results)
```

IMPORTANT:

- Web Engine and MCP Engine belong to the Sentinel platform and require the live-target authorization gate (Section 7A) before any scan starts.
- CodeSentinel remains an independent local tool. It never requires authorization because it never touches a target that isn't the user's own code.
- Do NOT merge CodeSentinel into the Sentinel backend, the job queue, or the Postgres/Redis infrastructure.
- CodeSentinel exports findings; Sentinel imports them. The connection is one-directional and optional.
- Do NOT create unnecessary coupling between the three engines. They must each build, run, and be useful standalone.

---

# 3. CORE DEVELOPMENT PRINCIPLE

Build the system incrementally.

NEVER attempt to implement the entire architecture in one step.

Always follow:

    PLAN
      ↓
    IMPLEMENT
      ↓
    TEST
      ↓
    VERIFY
      ↓
    DOCUMENT
      ↓
    NEXT PHASE

A phase is NOT complete merely because the code exists.

A phase is complete only when:

- The code compiles.
- Tests pass.
- The feature works end-to-end.
- Existing functionality still works.
- Security requirements are satisfied (including the authorization gate, where applicable).
- Documentation is updated.

---

# 4. DO NOT OVER-ENGINEER

This is an MVP/personal engineering project.

Do NOT introduce:

- Microservices without a real requirement.
- Kubernetes.
- Complex distributed systems.
- Unnecessary message queues.
- Unnecessary databases.
- Unnecessary authentication systems (beyond the target-authorization gate, which is a requirement, not an over-engineering risk).
- Billing systems.
- Multi-tenant architecture.
- Enterprise dashboards before the core scanner works.
- AI agents for deterministic tasks.

Prefer:

- Simple modules.
- Clear interfaces.
- Local execution where possible.
- Small dependencies.
- Deterministic behavior.
- Testable functions.
- Explicit configuration.

If a simpler solution works, use the simpler solution.

---

# 5. AI POLICY

AI MUST NOT be a dependency of the core system.

The system must remain fully functional when:

- No API key exists.
- No internet connection exists.
- Ollama is unavailable.
- The local model is unavailable.
- AI usage is disabled.

The deterministic scanner must still produce useful findings.

Default:

    AI = OFF

Never automatically call an AI model.

Never silently send source code, API data, credentials, or application data to an external AI provider.

AI must only be invoked when the user explicitly enables it.

AI, when enabled, may only:

- Confirm or downgrade a finding the deterministic engine already flagged as low-confidence.
- It must NEVER introduce a new finding category.
- It must NEVER be the sole basis for a critical/high severity finding.

---

# 6. AI TOKEN/COST POLICY

Token usage is a hard engineering constraint.

Default AI usage:

    0 calls
    0 paid tokens
    0 external AI requests

If AI is enabled:

1. Prefer the local Ollama model.
2. Use the configured local model (currently `dolphin-llama3:latest` — do not assume it is available; check gracefully and continue without AI if it isn't).
3. Batch findings instead of making one call per finding.
4. Enforce a hard call/token budget (`--budget N`, default 0).
5. Stop AI processing when the budget is reached; report remaining findings as unresolved-low-confidence, not silently skipped.
6. Never continue spending silently.
7. Report AI usage clearly — every AI-assisted run must print what was called and, where a paid API is used, an estimated token cost.

Do NOT automatically switch to a paid API. Paid APIs require an explicit flag (`--allow-paid-ai`) in addition to `--ai`.

---

# 7. SECURITY FIRST

Sentinel is a security-testing tool. Therefore Sentinel itself must be designed defensively, on two fronts: consent to scan, and defense against the target while scanning.

## 7A. AUTHORIZATION & CONSENT (applies to Web Engine and MCP Engine only)

**No scan of a live target may begin without explicit, logged authorization.**

- Every Project must record an authorization confirmation — the user attesting they own or have written permission to test the website and every linked MCP target — with a timestamp, before any Web Engine or MCP Engine job is enqueued.
- Authorization is per-target, not global. Adding a new MCP target to an existing project requires its own confirmation.
- The system must refuse to enqueue a scan job for any target without a matching authorization record. This is not a UI nicety — enforce it at the job-creation layer, not just the frontend, so it can't be bypassed by calling the API directly.
- CodeSentinel is exempt from this requirement entirely — it never scans anything but the user's own local filesystem, so there is no third party to protect.

## 7B. DEFENSE AGAINST THE TARGET

Never trust:

- Target applications.
- Target MCP servers.
- Tool descriptions.
- API responses.
- File contents.
- Configuration files.
- External input.

Treat all external input as untrusted data.

Never execute:

- Code from a target description.
- JavaScript from a scanned website (beyond what the browser sandbox itself executes during normal page load — Sentinel's own code must never `eval` or interpolate scanned content).
- Shell commands discovered in target content.
- MCP tool functions during static MCP analysis (introspection only — `listTools`/`listResources`/`listPrompts`, never an invocation method).
- Arbitrary strings as shell commands.

Use:

- Input validation.
- Timeouts.
- Sandboxing where appropriate (subprocess isolation for local MCP server targets; browser sandboxing for Web Engine).
- Resource limits.
- Safe subprocess handling.
- Secret redaction.
- Output escaping.
- Path validation.
- SSRF protection for the Web Engine specifically: block localhost, private IP ranges (RFC 1918), and cloud metadata endpoints (e.g. `169.254.169.254`) by default.

---

# 8. SHARED FINDING FORMAT

All Sentinel engines (Web, MCP) use a common finding structure in the same Postgres table. CodeSentinel uses a compatible export format that becomes this same shape on import.

```typescript
interface Finding {
  id: string;
  projectId: string;
  runId: string | null;        // null for CodeSentinel imports — they are
                                // tied to a CodeScanImport record, not a
                                // live TestRun
  engine: "web" | "mcp" | "code";
  ruleId: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "high" | "low";
  title: string;
  message: string;
  location?: string;           // URL/page for web, tool name for mcp,
                                // file:line for code
  evidence: Record<string, unknown>;
  remediation: string;
  relatedFindingId?: string;   // links a correlated finding across
                                // engines (Web<->MCP discovery,
                                // Code<->Web drift) — set explicitly by
                                // the aggregator, never inferred
  timestamp: string;
}
```

Example:

```json
{
  "engine": "web",
  "ruleId": "api-500-error",
  "severity": "high",
  "confidence": "high",
  "title": "API returned HTTP 500",
  "evidence": { "endpoint": "/api/checkout", "status": 500 },
  "remediation": "Investigate server error on /api/checkout; add client-side error handling regardless."
}
```

CodeSentinel may use its own internal format during local development, but its `--export` output must conform to this shape exactly, so import requires no translation layer.

Do NOT tightly couple engines just to share types. Use a stable interface/contract (this file + the schema in the architecture spec), not shared runtime code between Web/MCP workers and CodeSentinel.

---

# 9. WEB ENGINE

The Web Engine tests running applications. **Requires authorization (Section 7A) before every run.**

It should eventually detect:

### Application problems
- Broken links, broken images, broken scripts.
- Console errors, JavaScript runtime errors.
- Broken forms, navigation failures, redirect problems.

### API problems
- Failed API requests, HTTP 4xx/5xx responses.
- Missing error handling.
- Request/response inconsistencies where observable live.
- Broken API integrations.

### Security problems
- Security-header issues, CORS problems.
- Cookie configuration issues.
- TLS/mixed-content issues.
- Exposed paths/resources.
- SSRF-safe target validation (Section 7B) before every crawl.

### Other checks
- Basic performance observations.
- Detection of AI/chat widgets (feeds the manual MCP-target-linking flow — Section 11 of the architecture spec; do not build automatic discovery yet).
- Basic accessibility observations where explicitly implemented.

Do not attempt to build every possible web security scanner in the MVP. Prioritize reliable findings over large numbers of weak findings.

---

# 10. MCP ENGINE

The MCP Engine analyzes MCP servers. **Requires authorization (Section 7A) before every run.**

The primary MVP principle is:

    INTROSPECTION ONLY

Do NOT invoke target MCP tools, under any circumstance, for any reason.

The engine should inspect: tools, resources, prompts, tool schemas, descriptions, permissions/capabilities, transport information.

It should detect:
- Unsafe schemas, unbounded parameters.
- Excessive privileges, unscoped filesystem/shell/network access.
- Dangerous tool definitions, known vulnerability patterns (versioned CVE signature set).
- Authentication problems, TLS/transport problems.
- Suspicious metadata, hidden Unicode, prompt-injection-like metadata.
- Ambiguous tool definitions (flagged as lower-confidence by design — this is the category most exposed to false positives industry-wide; keep it explicitly lower-weighted).

Deterministic rules are the primary detection mechanism. AI must NOT decide whether an MCP server is fundamentally secure — it may only assist in triaging the ambiguous-tool-definition category, per Section 5.

---

# 11. CODESENTINEL

CodeSentinel is a separate local project/tool. It analyzes source code directly. It does NOT test a live domain and requires no authorization step.

It should detect:

### Bugs
- Type errors, null/undefined risks.
- Unhandled promises, unhandled API errors.
- Broken imports/symbols.
- Potential off-by-one errors where confidence is sufficient.

### API integration
- Broken API integrations, frontend/backend mismatches.
- Request/response mismatches, wrong HTTP methods.
- Missing required request fields, unexpected response shapes.
- Hardcoded invalid routes, missing error handling.

### Logic
- Dead code, unreachable code.
- Always-true/always-false conditions, contradictory conditions.
- Duplicate logic, empty catch blocks, suspicious logic drift.

### Cross-file consistency
- Configuration drift, duplicate constants.
- Validation-rule inconsistencies.
- Missing routes/functions, client/server contract mismatches.

The initial target stack is: **TypeScript, JavaScript, Node.js, React, Express, Next.js.**

Do not add additional programming languages before the TypeScript/JavaScript implementation is reliable and validated against fixtures.

---

# 12. CODESENTINEL MUST REMAIN LOCAL

CodeSentinel should work like:

    codesentinel scan ./project

It should: read the local filesystem, parse source code, build ASTs, analyze code, produce reports.

It should NOT require: Sentinel backend, PostgreSQL, Redis, cloud services, internet, or AI.

Optional integration looks like:

    CodeSentinel --export findings.json
         ↓
    findings.json  (conforms to Section 8 shape)
         ↓
    Sentinel import (POST /api/projects/:id/code-scan-import)
         ↓
    Creates a CodeScanImport record + Findings tagged engine: "code"
         ↓
    Aggregator may produce Code<->Web drift findings if a Web Engine
    run exists for the same project

The integration must be optional and user-initiated. Never automatic, never a background sync.

---

# 13. CODE ANALYSIS TECHNOLOGY

Do NOT write a custom JavaScript/TypeScript parser.

Use established tooling:
- TypeScript Compiler API.
- ts-morph.
- @typescript-eslint/parser.
- tree-sitter for future language expansion (post-MVP).

Use the compiler's type system where possible. Do not reinvent type checking.

---

# 14. CODESENTINEL CACHE

CodeSentinel must use content-hash caching, local only:

    File -> Hash -> Compare previous hash -> unchanged: skip | changed: analyze

This makes repeated scans cheap and is what keeps daily use free of both compute waste and (if AI is enabled) token waste. Never upload source code just to perform caching — the cache is a local file (`.codesentinel-cache.json`), not a remote service.

---

# 15. RESOURCE LIMITS

Every engine must have reasonable, centrally configured resource limits:

- Maximum file size, maximum files (CodeSentinel).
- Connection timeout, request timeout (Web, MCP).
- MCP introspection timeout, subprocess timeout (MCP).
- Rule execution timeout (all engines).
- AI timeout, AI call budget (all engines, when AI enabled).

Do not allow a malicious or broken target to hang Sentinel indefinitely. Avoid scattering magic numbers throughout the code — one config module per engine, values overridable via environment variables.

---

# 16. REPORTING

Reports are evidence-first. A finding should explain:

    WHAT happened, WHERE it happened, WHY it matters, HOW to fix it.

Avoid vague statements ("This code looks unsafe."). Prefer specific, mechanical descriptions ("fetch() is called without checking response.ok or handling the rejected promise.").

Never include secrets in reports. Redact API keys, tokens, passwords, credentials, and other private secrets before writing any evidence to disk.

---

# 17. FALSE POSITIVES

Do not optimize for finding the largest number of issues. Optimize for: useful findings + high confidence + actionable remediation.

A scanner that reports 1,000 incorrect problems is worse than one that reports 20 real problems — this is the entire competitive thesis behind the MCP Engine specifically (existing pattern-matching tools in that space are documented to have high false-positive rates; Sentinel's differentiation depends on beating that number, not just matching it).

Every new rule must be tested against known-vulnerable, known-safe, and borderline fixture cases before being trusted at default severity. If a rule creates excessive false positives, improve or disable it rather than hiding the problem.

---

# 18. TEST FIXTURES

Build test fixtures before aggressively expanding rules. Maintain, per engine:

    fixtures/
      vulnerable/  (or bugs/, api-integration/, illogical/ for CodeSentinel)
      safe/        (or clean/ for CodeSentinel)
      borderline/

Every important detection rule needs: a case it should detect, a case it should not detect, and a borderline case where applicable.

Do not claim a detection rate or false-positive rate unless it has actually been measured against fixtures.

---

# 19. DEVELOPMENT WORKFLOW

Before implementing a feature:

1. Read the architecture.
2. Read existing code.
3. Identify the correct module (and correct engine — do not let a Web Engine feature accidentally leak into MCP Engine code or vice versa).
4. Check whether the functionality already exists.
5. Plan the smallest implementation.
6. Implement it.
7. Add tests.
8. Run existing tests.
9. Run the new tests.
10. Check for regressions.
11. Update documentation.

Never blindly rewrite existing code.

---

# 20. DO NOT DESTROY EXISTING WORK

Before modifying an existing module: understand what it does, identify its callers, check its tests, preserve existing behavior unless the requested change requires otherwise.

Never delete working functionality simply to make implementation easier. Never replace a working architecture with a completely different architecture without explicit approval.

---

# 21. AGENT BEHAVIOR

DO:
- Inspect the repository first.
- Understand existing architecture.
- Reuse existing utilities.
- Make small changes.
- Test continuously.
- Explain important architectural decisions.
- Keep changes focused.

DO NOT:
- Generate the entire project from scratch if code already exists.
- Add unnecessary dependencies.
- Introduce AI just because a problem is difficult.
- Build future features prematurely.
- Change unrelated modules.
- Create unnecessary abstractions.
- Claim something works without testing it.
- Enqueue or execute a Web/MCP scan job without confirming an authorization record exists for that exact target (Section 7A) — treat a missing authorization check as a blocking bug, not a follow-up.

---

# 22. PHASE DISCIPLINE

Only work on the phase explicitly requested. If the project is currently in Phase 2, do NOT implement Phase 7.

If a future feature is required as a dependency, implement only the minimum foundation required for the current phase. Never silently expand scope.

---

# 23. WHEN REQUIREMENTS ARE AMBIGUOUS

Do not make a major architectural assumption silently.

For small implementation details: choose the simplest reasonable option.

For major architectural decisions: stop and explain the options, e.g.:

    "There are two ways to implement this.
     Option A keeps the engine independent.
     Option B couples it to the backend.
     The architecture currently favors A."

Then wait for direction if the decision materially affects the architecture.

---

# 24. AI AGENT SELF-CHECK

Before finishing every task, verify:

### Architecture
- Did I preserve the three-engine architecture?
- Did I keep CodeSentinel independent?
- Did I avoid unnecessary coupling?

### Authorization (new)
- Does every Web/MCP scan path check for a logged authorization record before enqueueing?
- Is authorization checked per-target, not just per-project?

### AI
- Did I accidentally introduce an AI dependency?
- Did I make any AI call without explicit permission?
- Is the deterministic path still fully functional with AI disabled?

### Security
- Did I introduce an unsafe subprocess?
- Did I execute untrusted input?
- Did I expose secrets?
- Are timeouts/resource limits respected?
- Is SSRF protection intact on any code path that fetches a URL?

### Quality
- Did I add tests?
- Did existing tests still pass?
- Did I introduce unnecessary dependencies?
- Did I modify unrelated functionality?

### Scope
- Did I implement only the requested phase?
- Did I accidentally build future functionality?

---

# 25. GOLDEN RULES

These rules override convenience.

1. Deterministic first.
2. AI optional.
3. Zero AI by default.
4. Local-first.
5. **No scan of a live target without logged authorization.**
6. Security before convenience.
7. Evidence before speculation.
8. High-confidence findings before noisy findings.
9. CodeSentinel remains independent.
10. Web and MCP engines remain independently runnable.
11. Never invoke MCP tools during static security analysis.
12. Never execute untrusted target content.
13. Cache source-code analysis.
14. Test before claiming success.
15. Build incrementally.
16. Do not over-engineer.
17. Do not silently change architecture.
18. Do not silently expand scope.
19. Preserve working functionality.
20. Prefer simple solutions.
21. If a feature can work without AI, build it without AI.

---

# 26. FINAL PROJECT VISION

```
    WEB TESTING  +  SOURCE CODE ANALYSIS  +  MCP SECURITY ANALYSIS
         +  OPTIONAL CORRELATION  +  OPTIONAL LOCAL AI  =  SENTINEL
```

- **CodeSentinel** = independent local code analyzer.
- **Sentinel Web Engine** = live application testing (authorized targets only).
- **Sentinel MCP Engine** = MCP security analysis (authorized targets only).
- **Sentinel Platform** = Web + MCP + shared findings/correlation, with optional CodeSentinel import for Code<->Web drift detection.

Do not collapse these into one giant application. Build each part correctly first. Connect them only where the connection provides real value.