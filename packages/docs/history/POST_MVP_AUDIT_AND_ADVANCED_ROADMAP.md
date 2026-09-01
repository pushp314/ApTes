# SENTINEL POST-MVP AUDIT & ADVANCED ROADMAP

## 1. Executive Summary
The Sentinel MVP has achieved strict feature completion across all designated architecture boundaries. Following the Phase 13 remediation cycle, all placeholder gaps within the CodeSentinel AST engine were closed using deterministic rules. Web ↔ MCP correlation was explicitly pinned to target configurations, ending false positives across engines. The quality gates (TypeScript, ESLint, and Vitest) are executing flawlessly with 100% pass rates across 85 integration and unit tests.

However, MVP completion does not equate to "Real-World Validated" or "Production Ready." The scanner currently functions perfectly in controlled laboratory conditions but requires exposure to live, noisy codebases to measure False Positive/False Negative (FP/FN) rates. This document audits the current state and outlines the professional validation strategy that must precede Phase 17 advanced feature development.

## 2. Current Architecture Inventory
The monorepo operates across 5 decoupled packages, coordinated by a central orchestrator:
* **`@sentinel/shared`**: Houses the universal `Finding` model—the critical contract enabling cross-engine correlation.
* **`@sentinel/codesentinel`**: A highly deterministic static analysis engine leveraging `ts-morph` AST parsing to discover Logic, Type, Security, and API Integration bugs.
* **`@sentinel/web`**: A passive, non-destructive web crawler identifying header misconfigurations, missing auth, and exposed AI widget targets.
* **`@sentinel/mcp`**: A sandboxed introspection engine that enumerates tools and checks for transport security and schema rigor without ever invoking destructive tool functions.
* **`@sentinel/platform`**: The orchestrator and CLI entry point (`sentinel-platform`). Aggregates findings, computes cross-engine risk vectors, runs the AI-assist loop, and generates multi-format reports.

## 3. MVP Verification (Requirement Matrix)
Every MVP requirement mapped to the original spec has been verified against the actual source code and passing test fixtures.

| Requirement | Status | Evidence Location |
|-------------|--------|-------------------|
| **Code: AST Parsing Pipeline** | PASS | `packages/codesentinel/src/parser.ts` |
| **Code: Bug Rules (Types, Undefined)** | PASS | `packages/codesentinel/src/rules/detectors/type-errors.ts` |
| **Code: API & Contract Drifts** | PASS | `api-integration.ts`, `contract-validation.ts` |
| **Code: Logic Contradictions** | PASS | `logic-contradictions.ts` |
| **Code: Security Rules** | PASS | `secrets.ts`, `injection.ts`, `auth.ts` |
| **Web: Security Headers & Cookies** | PASS | `packages/web/src/rules/security.ts` |
| **Web: AI Widget Detection** | PASS | `packages/web/src/rules/ai-widget.ts` |
| **MCP: Introspection & Schema Rigor** | PASS | `packages/mcp/src/rules/schema-rigor.ts` |
| **MCP: Privilege & Vulnerability** | PASS | `privilege-analysis.ts`, `cve-matching.ts` |
| **Platform: Strict Target Correlation** | PASS | `packages/platform/src/orchestrator.ts` |
| **Platform: Unified CLI & Reporting** | PASS | `cli.ts` & `reporters/index.ts` |
| **AI Assist: Local & Optional** | PASS | `ai-reviewer.ts` |

## 4. Engine-by-Engine Audit
* **CodeSentinel**: Successfully upgraded from basic syntax checking to deep structural analysis. It deterministically flags missing API error handlers, contradictory conditions, and string interpolation in sensitive database/system calls.
* **WebSentinel**: Acts strictly as a passive surface scanner. Its capabilities are constrained to reading HTTP responses and HTML DOM. It does *not* execute JavaScript single-page application routers or submit forms.
* **MCPSentinel**: Securely introspects tool capability lists. It is architecturally locked from invoking target tools, preventing accidental destructive mutations.
* **Platform**: Successfully maps `data-mcp-target` (Web) to explicit command configurations (MCP), producing High-Confidence Correlation findings without false matches.
* **AI Assist**: Correctly adheres to the token-control philosophy. It is disabled by default (`--ai` flag required) and only reviews `confidence: 'low'` findings via local `http://localhost:11434`.

## 5. Security Boundary Audit
* **SSRF Protection**: Verified. The Web Engine configuration allows local scanning only via explicit opt-ins (`allowLocal`), preventing accidental production SSRF loops.
* **Subprocess Sandboxing**: Verified. MCP target instantiation is decoupled from active tool invocations.
* **No Destructive Actions**: Verified. All scans are read-only. Web crawler respects HTTP GET paradigms; MCP Engine only issues introspection queries.

## 6. AI/Token Audit
* The system is explicitly configured for deterministic dominance. 
* Hard budgets and batching remain unimplemented stubs because the local Ollama integration effectively nullifies token costs. If paid APIs (OpenAI/Anthropic) are integrated in the future, explicit budget parameters must be added to `AiReviewer`.

## 7. Test Infrastructure Audit
* **Coverage**: 85 tests across unit and integration boundaries.
* **Pass Rate**: 100%.
* **Quality**: The tests are high fidelity, relying on actual DOM rendering (via dummy HTTP servers) and real AST parsing against `sample-project` fixtures rather than mocked logic loops.

## 8. Real-World Testing Strategy
We cannot trust laboratory fixtures alone. The next phase must introduce testing against:
1. **Clean Projects**: Measure False Positive noise rates.
2. **Vulnerable Projects** (e.g., intentionally broken repositories like OWASP Juice Shop analogues): Measure Detection Rate (True Positives).
3. **Borderline Projects**: Identify edge cases where valid code is flagged.
4. **Real Production Code**: Execute read-only scans against proprietary stacks to measure parser stability and orchestrator timeout handling.

## 9. Bug Laboratory Strategy
The current `sample-project` contains `safe/` and `vulnerable/` boundaries. This must be expanded into a permanent, version-controlled Bug Laboratory:
`fixtures/`
`├── safe/` (True Negatives)
`├── vulnerable/` (True Positives)
`├── borderline/` (Edge Cases)
Every new issue discovered in real-world testing must be committed as a standalone file in this laboratory before remediation begins.

## 10. False Positive/Negative Measurement
Sentinel will introduce telemetry for QA purposes (local output only). 
Metrics to track:
* **Precision**: (TP) / (TP + FP) — How noisy is the rule?
* **Recall**: (TP) / (TP + FN) — How much did the rule miss?

## 11. Weakness Discovery Process
Real-world findings will be categorized strictly into:
* **P0**: Engine crashes, sandbox escapes, or SSRF leaks.
* **P1**: Major vulnerability classes entirely missed by CodeSentinel.
* **P2**: Noisy rules generating >20% False Positives.
* **P3**: Formatting or CLI UX friction.

## 12. Remediation Process
1. Discover weakness during real-world scan.
2. Write a minimal reproduction in the Bug Laboratory.
3. Assert test failure.
4. Update AST traversal or regex heuristic.
5. Assert test pass without breaking existing laboratory fixtures.

## 13. Production Readiness Audit
* **Reliability**: Excellent on small projects; untested on monorepos >5,000 files.
* **Performance**: Under 6 seconds for the current test suite. Caching mechanism (`ContentHashCache`) effectively prevents re-parsing.
* **Security**: Sandbox perimeters are solid. 
* **Accuracy**: High in the laboratory, unknown in the wild.
* **Usability**: The CLI is functional, outputting clean terminal layouts and Markdown.

## 14. Production Readiness Score
**Overall Production Readiness: 85%**
*We are withholding a perfect score until the FP/FN rates are explicitly proven on wild codebases.*

## 15. Current Limitations
* **CodeSentinel**: AST parsing is limited to a single file at a time, making deep semantic cross-file taint-tracking impossible. Contract validation currently uses a naive global regex cache.
* **WebSentinel**: Does not render JavaScript (no Puppeteer/Playwright integration), blinding it to complex SPA architectures.
* **MCPSentinel**: Cannot detect vulnerabilities that require stateful multi-step tool execution.

## 16. Recommended Phase 17 Features
Do not build UI dashboards or cloud backends yet. Focus on analytical depth:
1. **Deeper Data-Flow Tracking**: Move beyond single-file AST parsing to cross-file variable taint tracking.
2. **SPA Rendering**: Integrate a headless browser into WebSentinel to analyze React/Vue payloads.
3. **Cross-Engine Risk Paths**: Map an exposed Frontend API → to a Missing Auth Backend Route → to a destructive MCP Tool capability, flagging the chain as a single `P0 Attack Path`.

## 17. Phase 17 Prioritization
* **Priority 1**: Cross-Engine Risk Path mapping (Highest security value).
* **Priority 2**: Deeper Data-Flow Tracking (Reduces FP noise).
* **Priority 3**: SPA Rendering (High architectural complexity, defer if necessary).

## 18. Phase 18+ Candidates
* **Phase 18 (Advanced Security)**: Authorization testing (IDOR detection) and dependency vulnerability mapping.
* **Phase 19 (MCP Intelligence)**: Dynamic tool fuzzing (with explicit user authorization loops).
* **Phase 20 (Project Intelligence)**: Trend mapping across multiple historical scans (Risk decay over time).
* **Phase 21 (Advanced AI Assist)**: Auto-generating PR patches (`.patch` format) for identified vulnerabilities.

## 19. Reporting Architecture
The current implementation scales perfectly. 
* `JsonReporter` feeds CI/CD pipelines.
* `MarkdownReporter` feeds GitHub/GitLab PR comments.
* `HtmlReporter` provides local dashboard viewing.
* `CliReporter` drives local developer experience.

## 20. Documentation Strategy
The `docs/` folder must be initialized. Every new rule added to CodeSentinel must be paired with a `docs/rules/{rule-id}.md` file detailing its heuristic approach, its FP risks, and its remediation logic.

## 21. Release Strategy
* **v0.1.0-alpha**: Current state. Internal validation only.
* **v0.2.0-beta**: Post Real-World Testing. Stable heuristics.
* **v1.0.0**: Production Ready.

## 22. Final Recommended Roadmap
1. **MVP Complete** (Current State)
2. **Real-World Validation** (Measure FP/FN on live repos)
3. **Bug Laboratory Expansion** (Documenting all failures)
4. **Production Hardening** (Fixing P1/P2 weaknesses)
5. **Phase 17 — Advanced Risk Path Analysis** (Linking Web to API to MCP)
6. **Phase 18 — Advanced Code Security** (Taint Tracking)
7. **Phase 19+** (Headless SPA rendering, AI Patch Generation)

## 23. WHAT I SHOULD DO NEXT

1. **The immediate next task**: Do NOT write any feature code. The immediate next task is to execute **Real-World Validation** by scanning a live, external project (or a large open-source repository) to measure the actual False Positive and False Negative rates.
2. **Why it should happen first**: Building Advanced Features (Phase 17) on top of an untested heuristic foundation will exponentially multiply False Positives, rendering the tool useless.
3. **What should NOT be built yet**: Do not build taint tracking, UI dashboards, or headless SPA rendering.
4. **What evidence must be collected**: We need a log of FP/FN rates, scanner execution time on a large repo, and a list of unexpected AST edge cases that crashed the parser.
5. **What condition allows Sentinel to proceed to Phase 17**: We proceed to Phase 17 only when the False Positive rate on real-world projects drops below an acceptable threshold (e.g., < 15%) and P0/P1 bugs in the AST parser are resolved.
