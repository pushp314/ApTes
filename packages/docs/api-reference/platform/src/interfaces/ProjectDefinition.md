[**sentinel**](../../../README.md)

***

# Interface: ProjectDefinition

## Properties

### aiBudget?

> `optional` **aiBudget?**: `number`

***

### aiEnabled?

> `optional` **aiEnabled?**: `boolean`

***

### aiModel?

> `optional` **aiModel?**: `string`

***

### aiProvider?

> `optional` **aiProvider?**: `string`

***

### aiUrl?

> `optional` **aiUrl?**: `string`

***

### allowLocalTargets?

> `optional` **allowLocalTargets?**: `boolean`

Local/private targets are blocked unless this testing-only opt-in is set.

***

### authorizationConfirmed

> **authorizationConfirmed**: `boolean`

Explicit attestation that the operator may scan this web target.

***

### authorizationConfirmedAt?

> `optional` **authorizationConfirmedAt?**: `string`

ISO-8601 timestamp at which the web-target attestation was made.

***

### codePath?

> `optional` **codePath?**: `string`

***

### id

> **id**: `string`

***

### mcpTargets

> **mcpTargets**: [`McpTarget`](McpTarget.md)[]

***

### webUrl

> **webUrl**: `string`
