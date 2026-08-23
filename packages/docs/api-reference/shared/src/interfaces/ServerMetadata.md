[**sentinel**](../../../README.md)

***

# Interface: ServerMetadata

Metadata about an MCP server's transport and configuration.

## Properties

### name?

> `optional` **name?**: `string`

Server name as reported by the server.

***

### tls?

> `optional` **tls?**: `boolean`

Whether TLS is in use (relevant for remote servers).

***

### transport

> **transport**: `"stdio"` \| `"sse"` \| `"http"`

Transport type used to connect.

***

### version?

> `optional` **version?**: `string`

Server version as reported by the server.
