# CLI Overview & Options

The Sentinel Unified CLI (`packages/platform/dist/cli.js`) exposes the `scan` command.

## Syntax
```bash
sentinel scan [options]
```

## Required Options
| Option | Description |
| --- | --- |
| `--project <id>` | Project ID. Used in correlation and reporting. |
| `--web <url>` | Web application URL to scan. |
| `--mcp <cmd>` | MCP server command to run (e.g., `"node server.js"`). |
| `--authorized` | **Must be provided.** Confirm that you own or have written permission to test the targets. |

## Optional Options
| Option | Default | Description |
| --- | --- | --- |
| `--code <path>` | `undefined` | Source code directory for backend analysis. |
| `--allow-local` | `false` | Allow localhost/private web targets. |
| `--ai` | `false` | Enable AI analysis for low-confidence findings. |
| `--budget <num>` | `5` | Maximum number of AI requests per scan. |
| `--ai-provider <provider>`| `ollama` | AI provider to use (`ollama`, `mock`). |
| `--ai-model <model>` | `llama3` | Ollama model to use. |
| `--ai-url <url>` | `http://localhost:11434` | Ollama API URL. |

## Internal Engine CLIs
If you wish to run a single engine without the orchestrator, you can invoke their specific CLIs:

::: code-group
```bash [CodeSentinel]
node packages/codesentinel/dist/cli.js scan <dir>
```

```bash [WebSentinel]
node packages/web/dist/cli.js scan <url> --i-own-this-target
```

```bash [MCPSentinel]
node packages/mcp/dist/cli.js scan <cmd> --i-own-this-target
```
:::
