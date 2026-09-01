# SENTINEL VERIFICATION AUDIT PLAN

This document outlines the strict criteria and checklist for the Formal Pre-Real-World Verification Audit of the Sentinel project.

## 1. Architecture Requirements
- [ ] CodeSentinel exists as a purely local source-code analyzer (no live domain, no network requests, no authorization gate required).
- [ ] WebSentinel exists as a live web application scanner (requires authorization, SSRF protections).
- [ ] MCPSentinel exists as a security analysis tool for MCP servers (introspection only, requires authorization).
- [ ] Platform orchestrates Web and MCP engines, and can optionally import CodeSentinel findings.
- [ ] Engines do not bleed responsibilities into each other (e.g., CodeSentinel does not execute Web crawler code).

## 2. Required Implementation
- [ ] **CodeSentinel:** Bug detection, API analysis, logic analysis, cross-file analysis, and security scanning (secrets, injection, auth).
- [ ] **WebSentinel:** Page discovery, headers, cookies, console errors, AI widget detection.
- [ ] **MCPSentinel:** Tool discovery, resource discovery, schema analysis, privilege analysis, CVE pattern matching.
- [ ] **Platform:** Job orchestration, Web ↔ MCP correlation, Code ↔ Web drift correlation.

## 3. Required Security Boundaries
- [ ] **Web/MCP Authorization:** No live scan begins without a recorded authorization statement per target.
- [ ] **MCPSentinel Execution:** NEVER calls `client.callTool()` or equivalent APIs. Introspection only.
- [ ] **WebSentinel SSRF:** Blocks localhost, RFC 1918 private IPs, and cloud metadata (169.254.169.254) by default.
- [ ] **Subprocess Isolation:** Local MCP targets run in a sandboxed subprocess (timeouts, restricted filesystem).
- [ ] **Secret Redaction:** Evidence containing API keys, passwords, or tokens is redacted before reporting or AI submission.

## 4. Required Deterministic Rules
- [ ] Security rules are primarily deterministic.
- [ ] AI does not act as the primary security scanner.
- [ ] High-confidence critical findings are derived exclusively from deterministic engines.
- [ ] The entire scan pipeline successfully executes and generates reports with AI disabled.

## 5. Required AI/Ollama Behavior
- [ ] **Default State:** AI is OFF (0 external calls, 0 paid tokens).
- [ ] **Explicit Opt-in:** `--ai` flag is required.
- [ ] **Model Constraint:** Defaults to local Ollama.
- [ ] **Budgeting:** Enforces a hard budget (`--budget N`) per run. Halts gracefully when exceeded.
- [ ] **Batching:** Groups findings instead of 1 request per finding.
- [ ] **Eligibility:** Only processes low-confidence findings.
- [ ] **Data Safety:** Context passes through the Secret Redactor first.
- [ ] **Output Validation:** JSON schemas strictly validate AI responses.

## 6. Required CLI Behavior
- [ ] `sentinel-platform` or equivalent CLI executes the full scan workflow.
- [ ] Supports full, incremental, and specific target configurations.
- [ ] Supports AI configuration flags (`--ai`, `--budget`, `--ai-model`, `--ai-url`).
- [ ] All documented arguments in the CLI help match actual implementations.

## 7. Required Reporting
- [ ] Uses the shared `Finding` model across all engines (`id`, `projectId`, `engine`, `severity`, `confidence`, `evidence`, etc.).
- [ ] Supports CLI summary, JSON export, Markdown export, and HTML export.
- [ ] Report visually distinguishes deterministic findings from AI-assisted insights.
- [ ] Findings maintain original severities and locations.
- [ ] Explicitly correlated findings are presented clearly.

## 8. Required Testing
- [ ] All rules have corresponding test fixtures (`safe`, `vulnerable`, `borderline`).
- [ ] Fixtures validate specific `ruleId`, `severity`, and `location`.
- [ ] Clean fixtures produce zero false-positive critical findings.
- [ ] The full CI suite passes (`typecheck`, `lint`, `build`, `test`).
- [ ] Tests validate failure paths (e.g., AI timeout, budget exhaustion, invalid JSON).

## 9. Required Documentation
- [ ] `ARCHITECTURE.md` (or `Sentinel_Combined_Architecture_Spec.md`) accurately describes the built system.
- [ ] `INSTRUCTION.md`, `DEVELOPMENT_RULES.md`, and `ROADMAP.md` align with the current MVP status.
- [ ] All documented features exist in the code; all implemented features are documented.
- [ ] Limitations and false-positive/negative risks are honestly stated.

## 10. Production-Readiness Criteria
- [ ] No unhandled exceptions or memory leaks on large repositories.
- [ ] Caching (CodeSentinel) successfully avoids redundant re-parsing.
- [ ] Resource limits (timeouts, max sizes) are enforced across all engines.
- [ ] No P0 (blocker) issues remain unresolved.
- [ ] System is safe to execute on real, sensitive external applications or internal MCP servers without risking data loss, exploitation, or unintentional DoS.
