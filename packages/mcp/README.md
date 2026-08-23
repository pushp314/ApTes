# MCP Engine safety boundary

The MCP Engine is **introspection only**: it calls `listTools`, `listResources`,
and `listPrompts`, and never invokes a target tool.

Before any scan, callers must supply an explicit authorization confirmation and
ISO-8601 timestamp. The CLI requires `--i-own-this-target` and records the timestamp
for that run.

Local stdio targets receive a restricted environment by default rather than the
parent process environment. Only `PATH` is inherited. Any additional variable
must be deliberately passed through `McpRunOptions.env`.

This is **not a complete subprocess sandbox**. A target process can still use
the filesystem and network permissions of the account running Sentinel. Run
untrusted MCP targets in a container, VM, or operating-system sandbox with
network and filesystem restrictions. Sentinel's timeout is a resource limit,
not an isolation mechanism.
