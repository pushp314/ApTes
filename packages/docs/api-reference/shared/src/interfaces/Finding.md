[**sentinel**](../../../README.md)

***

# Interface: Finding

A single finding produced by any Sentinel engine.

Every finding must answer four questions:
  WHAT happened, WHERE it happened, WHY it matters, HOW to fix it.

Evidence must never contain secrets (API keys, tokens, passwords).
Redact sensitive data before writing evidence.

## Properties

### aiAssessment?

> `optional` **aiAssessment?**: [`AiAssessment`](AiAssessment.md)

Optional AI assessment for this finding.
Set by the AI Reviewer for eligible low-confidence findings.

***

### category

> **category**: `string`

Category grouping for this finding.
Examples: "security-headers", "broken-links", "api-integration",
          "schema-rigor", "privilege-analysis", "type-error".

***

### confidence

> **confidence**: [`Confidence`](../type-aliases/Confidence.md)

Confidence level of the detection.
Low-confidence findings are eligible for optional AI-assisted triage.

***

### engine

> **engine**: [`EngineType`](../type-aliases/EngineType.md)

Which engine produced this finding.

Note: INSTRUCTION.md Section 8 uses "engine", Architecture Spec
Section 6 uses "engineType". We follow the explicit TypeScript
interface from INSTRUCTION.md.

***

### evidence

> **evidence**: `Record`\<`string`, `unknown`\>

Structured evidence supporting the finding.
Must NOT contain secrets (API keys, tokens, passwords, credentials).

***

### id

> **id**: `string`

Unique identifier for this finding.

***

### location?

> `optional` **location?**: `string`

Where the finding was detected.
- Web engine: URL or page path (e.g., "https://example.com/login")
- MCP engine: tool name (e.g., "filesystem_write")
- Code engine: file:line (e.g., "src/api/client.ts:42")

***

### message

> **message**: `string`

Detailed explanation of what was found.
Should be specific and mechanical, not vague.
Good: "fetch() is called without checking response.ok"
Bad:  "This code looks unsafe"

***

### projectId

> **projectId**: `string`

Project this finding belongs to.

***

### relatedFindingId?

> `optional` **relatedFindingId?**: `string`

Links a correlated finding across engines.
Examples:
- Web finding linked to the MCP finding it triggered discovery of
- Code finding linked to the Web finding showing API drift

Set explicitly by the aggregator, never inferred silently.
A drift finding (Code vs. Web) must only be created when both
a Code Engine import and a Web Engine run exist for the same project.

***

### remediation

> **remediation**: `string`

Actionable remediation guidance.

***

### ruleId

> **ruleId**: `string`

Identifier for the detection rule that produced this finding.

***

### runId

> **runId**: `string` \| `null`

TestRun this finding is associated with.
Null for CodeSentinel imports — they are tied to a CodeScanImport
record, not a live TestRun.

***

### severity

> **severity**: [`Severity`](../type-aliases/Severity.md)

Severity of the finding.

***

### timestamp

> **timestamp**: `string`

ISO 8601 timestamp of when this finding was created.

***

### title

> **title**: `string`

Short, human-readable title summarizing the finding.
