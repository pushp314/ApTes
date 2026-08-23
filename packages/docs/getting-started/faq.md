# Frequently Asked Questions

## General
### What makes Sentinel different from SonarQube or Snyk?
SonarQube and Snyk are primarily Static Application Security Testing (SAST) and Software Composition Analysis (SCA) tools. They operate in a single domain (source code). Sentinel operates across three domains (Source Code, Live Web Frontend, and AI Agents) and correlates findings between them to find multi-hop P0 attack paths that single-domain tools miss.

### Does Sentinel support Python or Go?
Currently, CodeSentinel only supports parsing TypeScript and JavaScript codebases via `ts-morph`. We plan to add Python support (using `libcst` or Python's native `ast`) in Q4 2026. However, WebSentinel and MCPSentinel are language-agnostic and will test any live web server or MCP agent.

## Security & Privacy
### Is my proprietary source code sent to OpenAI?
**No.** Sentinel is designed for highly secure enterprise environments. The AI Assist module uses local SLMs (Small Language Models) via Ollama. Furthermore, the `SecretRedactor` module mathematically guarantees that high-entropy secrets (AWS keys, Stripe tokens) are masked locally before the LLM ever sees the context.

### Why does WebSentinel abort my scan with an SSRF error?
By default, WebSentinel blocks scans targeting `localhost`, `127.0.0.1`, `10.x.x.x`, and Cloud Metadata endpoints (`169.254.169.254`). This prevents attackers from using Sentinel as a confused deputy. If you are scanning local fixtures for development, you must explicitly pass the `--allow-local` flag to the orchestrator.

## AI Assist
### Why does Sentinel use AI if it's deterministic?
Sentinel's primary detection logic is 100% deterministic (Regex, AST parsing, DOM crawling). We only use AI as a *secondary filter* for low-confidence heuristic rules. This gives you the reproducibility of deterministic rules with the low false-positive rate of AI triage.

### What happens if Ollama crashes during a scan?
Sentinel fails open. If the AI Assist module times out, crashes, or returns malformed JSON, the deterministic finding is preserved and output to the final report. You never lose a finding because of AI instability.
