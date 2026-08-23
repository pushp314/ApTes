# MCP Isolation

Model Context Protocol (MCP) servers are essentially automated agents executing local code. When MCPSentinel connects to test an MCP server, it does so using `StdioClientTransport`.

## Environmental Sandboxing

If a vulnerable MCP target accidentally dumps its environment, we must ensure it doesn't expose Sentinel's environment (e.g., system AWS keys).

MCPSentinel achieves this by spawning the `node server.js` target subprocess using a dedicated, stripped environment:
```typescript
{ PATH: process.env.PATH }
```
It does **not** inherit the parent's environment keys. This ensures strict isolation.
