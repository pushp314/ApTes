# Changelog

All notable changes to the Sentinel platform are documented in this file.

## [0.2.0-beta] - 2026-08-24

### Added
- **Interactive CLI Wizard:** Added a highly intuitive `sentinel` wrapper with Express and Advanced modes. The CLI features dynamic loaders, granular progress trackers, and real-time ETAs.
- **Enterprise Mission Control UI:** A fully redesigned, monochrome (black-and-white), Tier-1 cybersecurity aesthetic Web UI dashboard featuring a live multi-stage execution pipeline stepper.
- **Full-Screen AI Copilot:** Moved the AI Copilot out of a cramped drawer into a dedicated, context-aware, full-screen interactive page with syntax highlighting and rich Markdown support.
- **Gemini 1.5 Flash API Integration:** Supercharged the AI engine with optional native Google Gemini API support configured for strict schemas, lowest temperature, and minimum token usage.
- **Active Pentesting Modules:** Deployed the Admin Panel & Hidden API Route Discovery scanner via a multi-threaded Python engine (`packages/sentinel-py`) capable of running 130 probes in parallel.

## [0.1.0] - 2026-08-23
### Added
- **Tri-Boundary Orchestrator:** Initial release of the `@sentinel/platform` orchestrator capable of concurrent engine execution and mathematical correlation (e.g., `platform-mcp-exposure`).
- **WebSentinel Engine:** Implementation of the Playwright-based crawler. Added rules for `broken-images`, `web-console-errors`, `security-headers`, and heuristic `ai-widget` detection.
- **CodeSentinel Engine:** Implementation of the `ts-morph` AST parser. Added strict rules for `missing-auth`, `idor-risk`, `injection-risk`, and `hardcoded-secret`.
- **MCPSentinel Engine:** Implementation of the local `StdioClientTransport`. Added introspection rules for `mcp-privilege-analysis` and `mcp-schema-rigor`.
- **AI Assist:** Added the `LocalAiReviewer` using Ollama (`llama3`).
- **Auto-Remediation:** AI triage now generates strict JSON `.patch` files to automatically fix confirmed vulnerabilities.

### Security
- **SSRF Protection:** Web engine strictly blocks local, private, and cloud metadata IP ranges by default.
- **MCP Sandboxing:** Subprocesses spawned by MCPSentinel are now sandboxed using a `PATH`-only environment variable allowlist to prevent parent-environment secret leakage.
- **Consent Gate:** Orchestrator now strictly enforces the `--authorized` CLI flag before beginning any scans.
- **Secret Redaction:** High-entropy secrets are now deterministically redacted before being processed by the AI Assist module.

### Fixed
- Fixed an architectural bug where CodeSentinel had a circular dependency on `@sentinel/platform`. CodeSentinel is now completely standalone and uses a generic interface constraint.
