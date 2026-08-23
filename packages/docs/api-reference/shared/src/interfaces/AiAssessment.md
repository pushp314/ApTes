[**sentinel**](../../../README.md)

***

# Interface: AiAssessment

Structured AI assessment for a low-confidence finding.
Contains the AI's verdict, reasoning, and suggested remediation,
cleanly separated from the deterministic engine's output.

## Properties

### additionalEvidenceNeeded?

> `optional` **additionalEvidenceNeeded?**: `string`[]

***

### confidence

> **confidence**: `number`

***

### impact?

> `optional` **impact?**: `string`

***

### patch?

> `optional` **patch?**: `string`

***

### reason

> **reason**: `string`

***

### remediation?

> `optional` **remediation?**: `string`

***

### verdict

> **verdict**: `"confirmed"` \| `"likely"` \| `"uncertain"` \| `"dismissed"`
