[**sentinel**](../../../README.md)

***

# Interface: EngineRule

A single detection rule for the Web or MCP engine.

Rules must be:
- Deterministic (no AI dependency)
- Conservative (prefer lower confidence over false positives)
- Documented (what it detects, why it matters, known limitations)
- Tested (fixture for detection, fixture for non-detection)

## Properties

### category

> **category**: `string`

Category grouping for findings produced by this rule.
Examples: "security-headers", "broken-links", "schema-rigor".

***

### confidence

> **confidence**: [`Confidence`](../type-aliases/Confidence.md)

Default confidence level for findings produced by this rule.

***

### engineType

> **engineType**: `"web"` \| `"mcp"`

Which engine this rule belongs to.
Only "web" or "mcp" — CodeSentinel uses its own rule structure.

***

### id

> **id**: `string`

Unique rule identifier (e.g., "api-500-error", "unbounded-params").

***

### name

> **name**: `string`

Human-readable rule name.

***

### severity

> **severity**: [`Severity`](../type-aliases/Severity.md)

Default severity for findings produced by this rule.

## Methods

### evaluate()

> **evaluate**(`context`): [`Finding`](Finding.md)[] \| `Promise`\<[`Finding`](Finding.md)[]\>

Evaluate this rule against the provided context.
Returns zero or more findings.

Rules must:
- Not modify the target
- Not invoke MCP tools (MCP engine: introspection only)
- Not execute discovered code
- Respect timeouts
- Redact secrets from evidence

#### Parameters

##### context

[`EngineContext`](EngineContext.md)

#### Returns

[`Finding`](Finding.md)[] \| `Promise`\<[`Finding`](Finding.md)[]\>
