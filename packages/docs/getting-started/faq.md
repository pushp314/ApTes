# Frequently Asked Questions

## General

### What is Sentinel?
Sentinel is a **Tri-Boundary Security Orchestrator** — a developer tool that simultaneously analyzes your source code (AST), web frontend (DOM), and AI agent tools (MCP servers) to find vulnerabilities with zero false positives.

### How is Sentinel different from Snyk, SonarQube, or Semgrep?
Those tools scan a single boundary (usually source code) in isolation using regex or simple pattern matching. Sentinel scans three boundaries simultaneously and **correlates** findings across them. A vulnerability is only flagged as P0 when it's independently confirmed by the code AST, the live DOM, and the MCP tool schema. This mathematical correlation is what enables zero false positives.

### Does Sentinel execute my code?
**No.** CodeSentinel only reads and parses your source files into an AST. WebSentinel visits your web application in a sandboxed browser (read-only). MCPSentinel only introspects tool schemas — it never calls `tools/call`.

### What languages does Sentinel support?
- **TypeScript** and **JavaScript** (via `ts-morph`)
- **Python** (via `tree-sitter`)
- Any web application accessible via HTTP/HTTPS (WebSentinel)
- Any MCP-compatible server (MCPSentinel)

### Is my data sent to the cloud?
**No, by default.** Sentinel runs 100% locally. The optional Gemini integration requires an explicit API key and user opt-in. The default AI provider (Ollama) runs entirely on your machine.

---

## CLI & Usage

### How do I run a scan?
The simplest way:
```bash
sentinel
```
This launches the interactive wizard with Express Mode. Or use the Nmap-style CLI:
```bash
sentinel scan http://localhost:3000 -m "node server.js" -y -c ./src
```

### What does the `-y` flag mean?
It's the authorization confirmation (short for `--authorized`). Sentinel requires explicit confirmation that you legally own or have written permission to test the target. This is a legal safeguard.

### What does `-A` do?
It enables **Supercharged AI Auditing**. This connects to your local Ollama instance (or Gemini API) to triage ambiguous findings, generate 1-click patches, and create exploit PoCs.

### Can I scan without an MCP server?
Yes. Pass a dummy command like `-m "echo noop"`. Only CodeSentinel and WebSentinel will run.

### Can I scan only source code (no web)?
Yes. Pass a placeholder URL and disable web scanning:
```bash
sentinel scan http://localhost:3000 -m "echo noop" -y -c ./src
```

---

## AI Features

### Do I need Ollama to use Sentinel?
**No.** AI features are completely optional. Sentinel's core engines are 100% deterministic and work without any AI. The `-A` flag opts into AI features.

### What model should I use?
We recommend `llama3` (4.7 GB) for most use cases. For deeper analysis, try `llama3:70b` (40 GB) or `mixtral` (26 GB).

### Can I use Gemini instead of Ollama?
Yes. When running the interactive wizard, you'll be prompted to paste your Gemini API key. Sentinel also uses Gemini to auto-detect your project structure if heuristics fail.

---

## Security & Privacy

### Is it safe to run Sentinel on production code?
Yes. CodeSentinel never executes your code. It only reads files and parses them. WebSentinel uses a sandboxed browser. MCPSentinel never calls tools.

### Are my secrets safe?
Before any finding is sent to an AI provider, the `SecretRedactor` automatically strips all API keys, passwords, tokens, and credentials from the evidence payload. The AI never sees real secrets.

### Can Sentinel be used for malicious scanning?
Sentinel enforces strict authorization gates. The `--authorized` flag must be explicitly provided, and the interactive wizard requires a confirmation prompt. Additionally, WebSentinel blocks all private/internal IP ranges by default (SSRF protection).
