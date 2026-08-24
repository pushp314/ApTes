# How to Use Sentinel (Comprehensive Guide)

<div class="video-placeholder">
  <div class="video-overlay">
    <span class="play-icon">▶</span>
    <p>Watch: Sentinel Quick Start (3 mins)</p>
  </div>
</div>

Sentinel is a Tri-Boundary Security Orchestrator. Unlike traditional scanners that only look at static code, Sentinel actively correlates vulnerabilities across your Code (AST), your Web frontend (DOM), and your AI tool integrations (MCP).

This guide will teach you exactly how to use Sentinel to secure your applications with Zero Configuration required.

---

## 1. Installation

Sentinel operates entirely locally to ensure absolute data privacy. Install Sentinel globally:

```bash
npm install -g @sentinel/platform
```

*(If you are developing locally, run `npm link ./packages/platform` in the root of this repo).*

---

## 2. Zero-Config Scanning (Express Mode)

The absolute easiest way to use Sentinel is with its interactive, zero-config terminal wizard. Just navigate to your project directory and type:

```bash
sentinel
```

1. Select **🚀 Express Mode (1-Click, Auto-Detect)**.
2. Sentinel will automatically scan your directory, parsing `package.json` or `docker-compose.yml` to automatically deduce how to start your backend.
3. If it can't figure it out, it will offer to use the **Gemini AI API** to deeply analyze your workspace and deduce the command for you!
4. Sentinel will start up, scan your code, launch your backend, and crawl your frontend simultaneously.

---

## 3. The Nmap-Style CLI (Advanced Users)

For CI/CD pipelines or power users, Sentinel offers an expressive, Nmap-style CLI with short flags.

### General Syntax
```bash
sentinel scan <WEB_URL> -m "<MCP_COMMAND>" -y -c <CODE_PATH> -A
```

### Flag Breakdown
- **`<WEB_URL>`** *(Positional)*: The URL of the web application frontend you are testing (e.g., `http://localhost:3000`).
- **`-m / --mcp`**: The command to start the backend MCP server (e.g., `"node server.js"`).
- **`-y / --authorized`**: Confirm you are legally authorized to test the target (skips the interactive prompt).
- **`-c / --code`**: The path to your backend source code (defaults to `./`).
- **`-A / --ai`**: Enable Supercharged Local AI Auditing (Uses Ollama/Gemini to analyze complex logic flaws).
- **`-f / --format`**: The output format (`cli`, `json`, `html`, `md`).
- **`-E / --executive-report <dir>`**: Generates a beautiful HTML VC-friendly dashboard with an AI executive summary.

### Example: Tri-Boundary Unified Scan
To scan the included vulnerable sample project:
```bash
sentinel scan http://localhost:3000 -m "node ./backend/server.js" -y -c ./backend/src -A -E ./reports
```

### What happens under the hood?
1. **Parallel Execution:** CodeSentinel parses the AST (including Python `.py` files!), WebSentinel launches a headless browser, and MCPSentinel connects via stdio.
2. **Deterministic Triage:** Engines generate findings based on strict, deterministic heuristics (Zero hallucinations).
3. **Advanced Payload Analysis:** CodeSentinel mathematically infers frontend `fetch()` payloads vs backend route expectations without OpenAPI schemas, detecting exact contract mismatches.
4. **Intelligent Fuzzing:** WebSentinel queries local LLMs to dynamically generate adversarial Prompt Injection payloads against AI chat widgets.
5. **Tri-Boundary Synthesis:** The Orchestrator cross-references all this data to generate **Zero False Positive** alerts, complete with 1-Click Git Patches (`.patch`) and Exploit PoCs (`curl`)!

---

## 4. Enabling AI Assist (Ollama & Gemini)

Sentinel is deterministic by default. However, you can opt-in to probabilistic AI review for low-confidence findings using the `-A` flag.

The AI Reviewer runs locally using [Ollama](https://ollama.com/) (`llama3`) to guarantee zero data exfiltration, or via the **Gemini API** for cloud-scale analysis. The AI Reviewer will automatically intercept findings, redact sensitive secrets locally, evaluate if the finding is a False Positive, and generate explicit git diffs and PoC exploits for you.

---

## 5. CI/CD Integration (GitHub Actions)

Sentinel includes a native GitHub Action. Drop this into `.github/workflows/sentinel-action.yml`:

```yaml
name: "Sentinel Security Audit"
runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
    - run: npm install -g @sentinel/platform
    - run: sentinel run sentinel.config.json --format md > sentinel-report.md
    - uses: mshick/add-pr-comment@v2
      with:
        message-path: sentinel-report.md
```
This automatically comments a beautiful Markdown security audit directly on your Pull Requests!
