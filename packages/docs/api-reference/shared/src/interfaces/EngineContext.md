[**sentinel**](../../../README.md)

***

# Interface: EngineContext

Context provided to an EngineRule during evaluation.

Each engine provides its own context shape:
- Web engine: a Playwright Page + target URL
- MCP engine: a tool/resource/prompt manifest + server metadata

The context interfaces below are deliberately minimal stubs.
The actual implementations (with Playwright Page, MCP SDK types, etc.)
will be defined in their respective engine packages and will extend
or satisfy these shapes.

## Properties

### engineType

> **engineType**: `"web"` \| `"mcp"`

Which engine is running.

***

### mcpContext?

> `optional` **mcpContext?**: [`McpContext`](McpContext.md)

MCP engine context — present only when engineType is "mcp".

***

### projectId

> **projectId**: `string`

Project ID for finding attribution.

***

### runId

> **runId**: `string`

TestRun ID this evaluation belongs to.

***

### webContext?

> `optional` **webContext?**: [`WebContext`](WebContext.md)

Web engine context — present only when engineType is "web".
