# Sentinel AI Assist

Sentinel includes an **optional**, **local-first** AI Intelligence layer powered by Ollama. 

Unlike other scanners, Sentinel remains a deterministic security tool. The AI does NOT replace deterministic analysis; it acts purely as an assistant to investigate, explain, and prioritize **low-confidence** findings. 

**By default, AI is disabled, and Sentinel makes 0 AI requests.**

---

## 1. Architecture & Data Flow

1. **Deterministic Engines (Code, Web, MCP)** scan the project.
2. Findings are produced and filtered by confidence.
3. If AI is disabled, the process stops here.
4. If AI is enabled (`--ai`):
   - **High-confidence** findings bypass AI completely.
   - **Low-confidence** findings are sent to the Context Collector.
5. **Context Collector** gathers relevant file snippets and evidence.
6. **Secret Redactor** strips API keys, passwords, and tokens.
7. Findings are grouped into small **batches**.
8. **Budget Check** ensures the hard-coded max requests limit isn't exceeded.
9. **Ollama Provider** receives a structured JSON prompt.
10. The output is validated, cached, and attached to the finding as `aiAssessment`.

---

## 2. Configuration & CLI Usage

Normal scan (AI OFF):
```bash
npx sentinel-platform --project demo --web http://localhost:3000 --mcp "node server.js"
```

AI-assisted scan:
```bash
npx sentinel-platform --project demo --web http://localhost:3000 --mcp "node server.js" --ai --budget 10
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--ai` | `false` | Enables the AI Reviewer. |
| `--budget <num>` | `5` | Maximum number of AI requests (batches) per scan. Prevents unbound LLM loops. |
| `--ai-model <name>`| `llama3` | The Ollama model to use. |
| `--ai-url <url>` | `http://localhost:11434` | The endpoint for the Ollama instance. |

---

## 3. Privacy & Security

* **Local Only**: Sentinel defaults to a local Ollama instance. Source code never leaves your machine unless you explicitly point `--ai-url` to an external host.
* **Secret Redaction**: Sentinel uses regex to strip common tokens (AWS keys, Bearer tokens, URLs with basic auth) from the AI payload.
* **Sandbox Integrity**: The AI cannot execute shell commands, hit web endpoints, or invoke MCP tools. It strictly reads the finding JSON.

---

## 4. Token & Resource Controls

* **Batching**: Findings are grouped in batches of 10. A scan with 50 low-confidence findings requires only 5 requests.
* **Budget**: `--budget` strictly halts AI processing once the limit is hit, preventing your CPU/GPU from being pinned indefinitely on large repositories.
* **Caching**: Results are fingerprinted (rule, location, evidence, model) and saved to `.sentinel-ai-cache.json`. Repeated scans use the cache instead of making redundant Ollama requests.

---

## 5. Failure Behavior & Limitations

Sentinel is built to gracefully degrade. If Ollama is:
- Not installed
- Not running
- Times out
- Returns invalid JSON

The AI assessment is skipped safely, and the original deterministic finding is reported normally. The scan will **never crash** due to an AI failure.
