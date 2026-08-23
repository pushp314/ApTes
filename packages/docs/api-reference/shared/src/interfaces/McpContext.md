[**sentinel**](../../../README.md)

***

# Interface: McpContext

MCP engine evaluation context.
The mcp-worker package will provide the full implementation
with the actual MCP SDK manifest types.

## Properties

### manifest

> **manifest**: [`TargetManifest`](TargetManifest.md)

Introspected tool/resource/prompt manifest from the target MCP server.

***

### serverMeta

> **serverMeta**: [`ServerMetadata`](ServerMetadata.md)

Metadata about the target MCP server (transport, version, etc.).
