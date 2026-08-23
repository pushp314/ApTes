# Configuration

Sentinel is primarily configured via the CLI, but respects certain environment variables.

| CLI Option | Required | Default | Purpose |
| --- | --- | --- | --- |
| `--project <id>` | Yes | None | Identifies the scan session. |
| `--web <url>` | Yes | None | The URL for WebSentinel to crawl. |
| `--mcp <cmd>` | Yes | None | The command to boot the MCP server. |
| `--authorized` | Yes | None | Explicit consent to scan the targets. |
| `--allow-local` | No | `false` | Disables SSRF protection to allow scanning `localhost`. |
| `--code <path>`| No | `undefined`| The directory for CodeSentinel to analyze. |
| `--ai` | No | `false` | Enables the AI Assist module. |
| `--budget <num>`| No | `5` | Maximum number of LLM requests to make. |
| `--ai-provider`| No | `ollama` | Provider: `ollama` or `mock`. |
| `--ai-url <url>`| No | `http://...`| The Ollama server URL. |
