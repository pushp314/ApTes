# Known Limitations

Sentinel is a specialized tool and has several documented limitations based on its current architecture.

## WebSentinel Limitations
- **Crawler Depth:** It does not currently recurse indefinitely; it is an observational scanner, not a full site ripper.
- **Form Fuzzing:** It does not actively inject SQLi or XSS payloads into forms. It only analyzes structure and headers statically from the DOM response.
- **Authentication:** It currently does not support logging in via complex OAuth flows before scanning a site.

## CodeSentinel Limitations
- **Dynamic Types:** Since it uses static AST parsing (`ts-morph`), heavily dynamically typed code (e.g., `any` casts) might obscure logic flaws.
- **Language Support:** Currently only supports TypeScript and JavaScript.

## MCPSentinel Limitations
- **SSE Transport:** Not currently supported. It only supports `StdioClientTransport`.

## AI Assist Limitations
- **Budgeting:** If a scan produces 100 low-confidence findings and the budget is 5, 95 findings will remain untriaged.
- **Hallucinations:** Despite strict JSON prompting, the local Ollama model (`llama3`) may occasionally fail to produce a valid `patch` string for complex logic errors.
