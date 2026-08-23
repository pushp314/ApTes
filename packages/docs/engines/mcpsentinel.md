# MCPSentinel

MCPSentinel audits Model Context Protocol (MCP) servers. As AI agents increasingly integrate with critical infrastructure, MCPSentinel verifies that these servers do not expose unbounded capabilities.

## Execution Model: Introspection Only

**CRITICAL NOTE:** MCPSentinel is strictly an observational engine.
- It **does not** call `execute` or `callTool` on the MCP target.
- It relies entirely on `listTools()`, `listPrompts()`, and `listResources()` to build a map of the server's capabilities.
- It does not execute actions that mutate state.

## Subprocess Isolation

When testing local MCP servers via standard I/O (StdioClientTransport):
- The subprocess **does not** inherit the parent environment.
- Sentinel explicitly sandboxes it by passing a restricted `PATH`-only environment variable dict via `createRestrictedSubprocessEnv`.
- This prevents the MCP target from accidentally or maliciously reading Sentinel's own secrets (like the Ollama URL) from memory.

## Implemented Rules

### 1. MCP Privilege Analysis (`mcp-privilege-analysis`)
- **Purpose:** Detects tools that expose dangerous capabilities without constraints.
- **Detection:** Analyzes the tool schema. If a tool has `execute`, `exec`, or `read_file` in its name but accepts unbounded inputs (e.g., arbitrary strings instead of Enums), it flags it as a `CRITICAL` RCE or Path Traversal risk.

### 2. Schema Rigor (`mcp-schema-rigor`)
- **Purpose:** Detects poorly defined tool schemas that increase hallucination risks.
- **Detection:** Flags string parameters that lack `enum`, `maxLength`, or `pattern` constraints. Flags empty object payloads.

### 3. CVE Matching (`mcp-cve-matching`)
- **Purpose:** Detects known vulnerable MCP servers.
- **Detection:** String matches the server's manifest name against known vulnerable components.

### 4. Transport Security (`mcp-transport-security`)
- **Purpose:** Warns if the server uses insecure transports.
- **Detection:** Flags the use of `SSE` (Server-Sent Events) over non-TLS connections (although standard I/O is local and safe).
