# Sentinel: Real-World Validation & Advanced Roadmap Strategy

This document outlines the professional procedure for conducting manual, real-world validation of the Sentinel MVP ecosystem. It establishes how to measure the effectiveness of the engines, identify architectural weaknesses, and prioritize the Phase 17+ (Advanced Features) roadmap based on empirical data rather than hypotheticals.

---

## 1. Professional Real-World Testing

To prove Sentinel is production-ready, it must be tested against realistic, complex, and intentionally vulnerable targets outside of its own internal fixture laboratory.

### Target Selection
1. **Target A: Modern SPA Web Application (e.g., OWASP Juice Shop)**
   - **Why:** Tests `WebSentinel`'s ability to navigate single-page applications, detect client-side DOM vulnerabilities, and parse complex JavaScript chunks.
2. **Target B: Legacy/Standard Web Application (e.g., DVWA)**
   - **Why:** Tests `WebSentinel`'s baseline capabilities (cookie flags, security headers, simple SQLi in forms, mixed content).
3. **Target C: Complex Open-Source TypeScript Project**
   - **Why:** Tests `CodeSentinel`'s AST parsing robustness, caching efficiency, and ability to handle complex generic types without crashing or hanging.
4. **Target D: Unsafe MCP Server**
   - **Why:** Tests `MCPSentinel`'s schema rigor and privilege analysis on a server with known dangerous tools (e.g., unbounded bash execution, unprotected file system writes).

### Execution Guide
Run the `sentinel-platform` CLI against the targets:
```bash
# 1. Run deterministic baseline scan
sentinel-platform scan --target-dir <path> --web-url <url> --mcp-command "node vulnerable-mcp.js" --format json > run1-baseline.json

# 2. Run with AI Assist enabled (Budget: 25)
sentinel-platform scan --target-dir <path> --web-url <url> --mcp-command "node vulnerable-mcp.js" --ai --budget 25 --format json > run2-ai.json
```

---

## 2. Measuring False Positives & Negatives

A scanner is only as good as its signal-to-noise ratio. The testing phase must rigidly categorize every finding.

### Metric Schema
After generating the JSON reports, manually review the findings and categorize them:
- **True Positive (TP):** Sentinel found a vulnerability that actually exists and poses a real risk.
- **False Positive (FP):** Sentinel flagged code/behavior as vulnerable, but it is benign or mitigated (Noise).
- **True Negative (TN):** Sentinel correctly ignored safe code.
- **False Negative (FN):** A known vulnerability exists in the target, but Sentinel failed to detect it.

### Evaluation Formula
- **Precision:** `TP / (TP + FP)` (How much of the output is actual signal?)
- **Recall:** `TP / (TP + FN)` (How much of the total vulnerable surface did we find?)

*Target MVP Metrics: > 85% Precision on High/Critical deterministic findings.*

---

## 3. Identifying & Fixing Weaknesses

During real-world validation, Sentinel *will* fail on certain edge cases. The goal is to identify *why* it failed so we can systematically patch the architecture.

### Common Weakness Categories
1. **AST Obfuscation / Framework Magic (CodeSentinel):** Next.js, Nuxt, or heavily metaprogrammed code may hide actual API routes from the standard AST parser.
   - *Fix Strategy:* Develop framework-specific plugins for the AST parser (Phase 17+).
2. **SPA Rendering Walls (WebSentinel):** The crawler may fail to see vulnerabilities hidden behind complex React/Vue state changes.
   - *Fix Strategy:* Introduce deeper Playwright interaction heuristics (Phase 17+).
3. **Natural Language Ambiguity (MCPSentinel):** Tool descriptions might be vague, leading to false positives on privilege escalation.
   - *Fix Strategy:* Tune the AI Reviewer prompt specifically for MCP semantic analysis.

---

## 4. Production-Readiness Criteria

Before officially exiting the Validation Phase and entering General Availability (GA), Sentinel must meet these thresholds:

- [ ] **Stability:** Zero unhandled exceptions, memory leaks, or indefinite hangs on any of the real-world targets.
- [ ] **Security:** SSRF protections hold firm (no loopback or metadata IP access via WebSentinel).
- [ ] **AI Safety:** The `SecretRedactor` perfectly scrubs tokens/keys before they hit Ollama in all test cases.
- [ ] **Noise Limit:** The False Positive rate for `High` and `Critical` deterministic findings remains strictly below 15%.
- [ ] **Performance:** CodeSentinel caching successfully reduces subsequent scan times on massive projects by at least 60%.

---

## 5. Phase 17+ Advanced Features Planning

Once testing proves the deterministic foundation is solid, development can proceed to the Advanced Roadmap. Based on likely gaps found during real-world testing, prioritize these features:

### P0: Cross-Engine Risk Path Mapping (Taint Tracking)
- Track a tainted variable from a vulnerable `WebSentinel` input field down through the connected `MCPSentinel` backend.
- Highly valuable if testing reveals that isolated vulnerabilities are benign until chained across engines.

### P1: CI/CD Integration & Regression Detection
- Implement GitHub Actions and GitLab CI wrappers.
- Add history diffing (e.g., `sentinel compare prev.json current.json`) to detect when a developer introduces a new regression.

### P2: Framework-Aware AST Parsing
- Add explicit support for Next.js App Router and Express middleware chains to reduce CodeSentinel false negatives.

### P3: Enhanced SPA Web Engine
- Implement authenticated crawler state storage and fuzzing capabilities for complex web forms.

---

## 6. Lifecycle Documentation Process

To maintain project integrity as we move forward:
1. **Bug Reports:** All False Positives and False Negatives discovered during testing must be documented in `sentinel-lab/` as new fixtures (e.g., `fp-react-router.ts`).
2. **Rule Iteration:** A rule is only modified *after* a failing fixture is created in the lab.
3. **Audit Trails:** Every major version bump requires a re-run of the Verification Audit against the `ARCHITECTURE.md` spec.
