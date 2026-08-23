# Roadmap

The following features are planned for post-MVP development. **None of these are currently implemented.**

## Q4 2026

- [ ] **AI Assist Caching:** Implement a local SQLite or filesystem cache for Ollama responses to avoid re-evaluating the exact same code snippet on subsequent scans.
- [ ] **SSE Transport for MCP:** Add support for Remote MCP server connections over HTTPS/SSE (Server-Sent Events) rather than just local stdio subprocesses.
- [ ] **CodeSentinel Python Support:** Expand AST parsing to Python codebases using a Python-equivalent parser (e.g., `ast` or `libcst`).
- [ ] **Advanced Crawler Authentication:** Allow WebSentinel to accept a Playwright `.json` state file to scan authenticated sessions.

## 2027

- [ ] **Continuous Integration (CI) Actions:** Official GitHub Actions and GitLab CI components that automatically post the `HtmlReporter` output as a PR comment.
- [ ] **Distributed Scanning:** Allow the orchestrator to farm out engine execution to Kubernetes workers for massive monorepos.
