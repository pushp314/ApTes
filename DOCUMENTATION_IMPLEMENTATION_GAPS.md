# Documentation vs Implementation Gaps

During the repository parsing and mapping phase, the following discrepancies and functional gaps were discovered in the actual implementation compared to theoretical ideals. These have been accurately reflected in the generated documentation.

## 1. WebSentinel SSRF Protection (DNS Rebinding)
- **Source File:** `packages/platform/src/orchestrator.ts` / `packages/web/src/runner.ts`
- **Documented Behavior:** SSRF protection blocks private IPs and localhost.
- **Actual Behavior:** The current implementation uses simple regex matching on the URL string (e.g., matching `127.0.0.1` or `localhost`). It **does not** perform live DNS resolution before navigating.
- **Severity:** `MEDIUM`
- **Recommendation:** Implement a custom Playwright network interceptor that resolves DNS records and aborts the request if the resolved IP falls into a private subnet, preventing DNS Rebinding attacks.

## 2. Platform Correlation Engine
- **Source File:** `packages/platform/src/orchestrator.ts`
- **Documented Behavior:** The orchestrator correlates findings across engines.
- **Actual Behavior:** The correlation logic is currently hardcoded as a single rigid function (`if (hasWidget && hasMcp && hasMissingAuth)`). It lacks a generic rule-engine structure (like CodeSentinel) for easily adding new correlation signatures.
- **Severity:** `LOW`
- **Recommendation:** Abstract correlation logic into a `rules/` directory for the platform package, similar to the engines.

## 3. MCPSentinel Transport Options
- **Source File:** `packages/mcp/src/runner.ts`
- **Documented Behavior:** MCP connects via standard I/O subprocesses.
- **Actual Behavior:** The `mcp-transport-security` rule checks for SSE usage, but the runner itself only supports `StdioClientTransport`. It cannot actually connect to a remote SSE server yet.
- **Severity:** `LOW`
- **Recommendation:** Add an `--mcp-url` CLI flag to support `SSEClientTransport`.
