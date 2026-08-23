# How to Use Sentinel (Comprehensive Guide)

Sentinel is a Tri-Boundary Security Orchestrator. Unlike traditional scanners that only look at static code, Sentinel actively correlates vulnerabilities across your Code (AST), your Web frontend (DOM), and your AI tool integrations (MCP).

This guide will teach you exactly how to use Sentinel from the command line to secure your applications.

---

## 1. Installation & Build

Sentinel operates entirely locally to ensure absolute data privacy. Before running a scan, ensure the repository is fully built.

::: code-group
```bash [npm]
npm install
npm run build
```
```bash [yarn]
yarn install
yarn build
```
```bash [pnpm]
pnpm install
pnpm build
```
:::

---

## 2. The Basic CLI Scan

The core of Sentinel is the `sentinel-platform` CLI. You use it to define your targets. A target can be a web URL, a local directory, or an MCP server command. You can scan one or all of them simultaneously.

### Scanning Local Code (CodeSentinel)
To scan a local TypeScript or JavaScript directory for hardcoded secrets, NoSQL injections, and missing authentication middleware:

```bash
node packages/platform/dist/cli.js scan \
  --project my-backend \
  --code ./src \
  --authorized
```

> [!IMPORTANT]
> The `--authorized` flag is a strict requirement. Sentinel will abort execution if you do not explicitly authorize the scan, ensuring it is never run accidentally against production systems.

### Scanning a Web Frontend (WebSentinel)
To scan a live web application for missing security headers, exposed cookies, or unprotected AI chat widgets:

```bash
node packages/platform/dist/cli.js scan \
  --project my-frontend \
  --web https://staging.mycompany.com \
  --authorized
```

> [!WARNING]
> By default, Sentinel blocks scanning local IP addresses (like `127.0.0.1`) to prevent Server-Side Request Forgery (SSRF). If you are testing a local server, you **must** append the `--allow-local` flag.

### Scanning an MCP Server (MCPSentinel)
To inspect an AI Agent's Model Context Protocol (MCP) server for dangerous capabilities without actually executing the tools:

```bash
node packages/platform/dist/cli.js scan \
  --project ai-agent \
  --mcp "node ./my-mcp-server/index.js" \
  --authorized
```

---

## 3. The Tri-Boundary Unified Scan (Recommended)

The true power of Sentinel is Correlation. By scanning all three boundaries simultaneously, Sentinel can mathematically prove attack paths (e.g., an exposed frontend widget connecting to a backend with missing authentication, hooking into a destructive MCP tool).

To run a unified scan, simply combine the flags:

```bash
node packages/platform/dist/cli.js scan \
  --project unified-test \
  --code ./backend/src \
  --web http://localhost:3000 \
  --mcp "node ./ai-tools/server.js" \
  --authorized \
  --allow-local
```

### What happens under the hood?
1. **Parallel Execution:** CodeSentinel parses the AST, WebSentinel launches a headless browser, and MCPSentinel connects via stdio.
2. **Deterministic Triage:** Engines generate findings based on strict, deterministic heuristics (Zero hallucinations).
3. **Correlation:** The Orchestrator cross-references the findings to elevate Severities based on overlapping attack surfaces.

---

## 4. Enabling AI Assist (Llama 3 / Ollama)

Sentinel is deterministic by default. However, you can opt-in to probabilistic AI review for low-confidence findings. The AI Reviewer runs entirely locally using [Ollama](https://ollama.com/), guaranteeing zero data exfiltration.

First, ensure Ollama is running locally with the `llama3` model:
```bash
ollama run llama3
```

Then, append the `--ai` flag to your scan:
```bash
node packages/platform/dist/cli.js scan \
  --project ai-assisted-scan \
  --code ./src \
  --authorized \
  --ai
```

The AI Reviewer will automatically intercept the findings, redact sensitive secrets, and ask Llama 3 to evaluate if the finding is a False Positive.

---

## 5. Reviewing the Reports

Once the scan completes, Sentinel generates multiple reports by default:

1. **Terminal Output:** A beautiful, color-coded summary prints directly to your CLI.
2. **`scan-results.txt`:** A plaintext archive of the terminal output.
3. **`unified_output.txt`:** A raw JSON dump of all cross-engine findings, perfect for CI/CD ingestion and historical tracking.

### Example Terminal Output
```text
========================================
    SENTINEL UNIFIED REPORT
========================================
Project: my-unified-scan
Score:   0/100
Time:    4210ms
========================================

[ENGINE: CODE]
  [CRITICAL] SQL Injection Risk
             Unsafe string interpolation or concatenation detected in a sensitive database call.
             Rule: injection-risk | Location: src/db.ts:48:3
             Fix: Use parameterized queries or prepared statements.

[ENGINE: WEB]
  [HIGH] Missing Security Headers
         The response is missing critical security headers (CSP, HSTS).
         Rule: web-security-headers | Location: http://localhost:3000
         Fix: Configure your web server to emit Strict-Transport-Security.
```

---

## 6. Using a Configuration File

Instead of passing dozens of flags, you can create a `.sentinel.config.js` file in your project root.

```javascript
module.exports = {
  project: "my-production-app",
  targets: {
    code: "./src",
    web: "https://staging.example.com",
    mcp: "node ./mcp/server.js"
  },
  ai: {
    enabled: true,
    budget: 50,
    model: "llama3"
  }
}
```

Then, simply run:
```bash
node packages/platform/dist/cli.js scan --authorized
```
Sentinel will automatically pick up your configuration file and execute the comprehensive scan!
