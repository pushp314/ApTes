<div align="center">
  <h1>🛡️ Sentinel Security Platform</h1>
  <p><b>The Tri-Boundary Security Orchestrator for AI-Driven Web Architectures</b></p>
</div>

---

## 🚀 The Zero False-Positive Security Engine

Modern full-stack applications integrate complex frontends, dynamic backends, and advanced AI agent protocols (like the Model Context Protocol). Traditional static analysis tools (grep-based SAST) and dynamic scanners (DAST) operate in silos. They generate thousands of false-positive alerts by blindly flagging "missing authentication" or "hardcoded strings" without understanding if the code is actually reachable or exploitable.

**Sentinel changes everything.**

Sentinel is a revolutionary **Tri-Boundary Orchestrator**. It mathematically proves complete exploit chains across your entire architectural stack by running three distinct security engines simultaneously and correlating their findings.

### 🧠 The Three Engines

1. **CodeSentinel (Static AST Analysis)**
   Uses the TypeScript Compiler API (`ts-morph`) to perform deterministic, cross-file data-flow tracking. It traces variable taint from function parameters, across ES6 imports, deep into database execution sinks.
2. **WebSentinel (Playwright DOM Fuzzing)**
   Actively crawls your frontend. When it detects a third-party AI Widget, it injects tracking payloads, clicks submit, captures visual screenshots, and intercepts the exact XHR/fetch network requests the widget makes.
3. **MCPSentinel (Agent Protocol Security)**
   Scans Model Context Protocol (MCP) servers to ensure that AI agents aren't granted unbounded privileges (like arbitrary `fs.writeFile` access) on the host machine.

### 🔗 Exact Path Correlation = Zero False Positives

When all three engines run, the **Platform Orchestrator** synthesizes their data to find true architectural vulnerabilities. 

**Example P0 Attack Chain Detected by Sentinel:**
1. *WebSentinel* interacts with a Chat Widget and proves it talks to `/api/chat`.
2. *CodeSentinel* statically proves that `/api/chat` is missing an authentication middleware.
3. *CodeSentinel* statically proves that `/api/chat` invokes an MCP Client `callTool()` method.
4. *MCPSentinel* statically proves that the target MCP Tool has unbounded, critical host access.

Sentinel reports this as a single, verified **`platform-p0-attack-path`**. It proves that an unauthenticated user on the frontend can achieve Remote Code Execution (RCE) via an AI widget. 

---

## ✨ Features

- **Structural Taint Tracking:** Follows data flow across files, bypassing the limitations of simple regex matching.
- **Payload Schema Inference:** Automatically infers expected backend payloads and frontend `fetch()` bodies, reporting strict `Request/Response Mismatches` without needing shared TypeScript interfaces or OpenAPI specs.
- **Configuration Drift:** Compares `docker-compose.yml` environment variables against `.env.example` to ensure infrastructure parity.
- **DOM-to-Network Correlation:** Interacts with the live DOM to mathematically prove which backend route serves which frontend component.
- **AI Triage Integration:** Leverages Ollama (Llama 3) strictly within deterministic token budgets to classify and redact low-confidence findings.

---

## ⚡ Quick Start

### 1. Installation

```bash
git clone https://github.com/pushp314/ApTes.git
cd ApTes
npm install
```

### 2. Build the Platform

```bash
npm run build
```

### 3. Run a Scan

To run a scan, you simply invoke the platform CLI and point it to your codebase, a running frontend URL, and your MCP server execution command:

```bash
node packages/platform/dist/cli.js scan \
  --project "my-startup" \
  --web "http://localhost:3000" \
  --mcp "node packages/mcp/fixtures/server.js"
```

*For more detailed configuration options and rule customization, visit the [Documentation Website](./packages/docs).*

---

<div align="center">
  <i>Engineered for the next generation of AI applications.</i>
</div>
