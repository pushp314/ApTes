<div align="center">
  <h1>🛡️ Sentinel Security Platform</h1>
  <p><b>The Static-Dynamic Security Orchestrator for Web Architectures</b></p>
  <p>
    <a href="https://github.com/pushp314/ApTes/actions/workflows/ci.yml"><img src="https://github.com/pushp314/ApTes/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/Tests-159%20passing-brightgreen" alt="159 Tests Passing" />
  </p>
</div>

---

## 🚀 The Zero False-Positive Security Engine

Modern full-stack applications integrate complex frontends and dynamic backends. Traditional static analysis tools (grep-based SAST) and dynamic scanners (DAST) operate in silos. They generate thousands of false-positive alerts by blindly flagging "missing authentication" or "hardcoded strings" without understanding if the code is actually reachable or exploitable.

**Sentinel changes everything.**

Sentinel is a revolutionary **Dual-Engine Orchestrator**. It mathematically proves complete exploit chains across your architectural stack by running two distinct security engines simultaneously and correlating their findings.

### 🧠 The Engines

1. **CodeSentinel (Static AST Analysis)**
   Uses the TypeScript Compiler API (`ts-morph`) to perform deterministic, cross-file data-flow tracking. It traces variable taint from function parameters, across ES6 imports, deep into database execution sinks.
2. **WebSentinel (Playwright DOM Fuzzing)**
   Actively crawls your frontend. When it detects interactive components, it injects tracking payloads, clicks submit, captures visual screenshots, and intercepts the exact XHR/fetch network requests the widget makes.

### 🔗 Exact Path Correlation = Zero False Positives

When both engines run, the **Platform Orchestrator** synthesizes their data to find true architectural vulnerabilities.

**Example Drift Detection:**

1. _WebSentinel_ inspects a live endpoint returning `{userId, fullName, email}`.
2. _CodeSentinel_ statically analyzes the client expecting `{id, name, email}`.
3. The platform correlates these findings to identify a clear **Configuration Drift** or **Schema Mismatch**.

Sentinel reports verified configuration drifts directly, removing the noise from single-source false positives.

---

## ✨ Features

- **Structural Taint Tracking:** Follows data flow across files, bypassing the limitations of simple regex matching.
- **Payload Schema Inference:** Automatically infers expected backend payloads and frontend `fetch()` bodies, reporting strict `Request/Response Mismatches` without needing shared TypeScript interfaces or OpenAPI specs.
- **Configuration Drift:** Compares `docker-compose.yml` environment variables against `.env.example` to ensure infrastructure parity.
- **DOM-to-Network Correlation:** Interacts with the live DOM to mathematically prove which backend route serves which frontend component.
- **AI Triage Integration:** Leverages Ollama (Llama 3) strictly within deterministic token budgets to classify and redact low-confidence findings.

---

## 🤖 Optional Third Engine: MCP Sentinel

Sentinel also includes an opt-in **MCPSentinel** engine for advanced AI-driven architectures.
If your application uses the Model Context Protocol (MCP) to connect AI agents to backend services, MCPSentinel can scan those MCP servers to ensure agents aren't granted unbounded host privileges (like arbitrary file system access).

While CodeSentinel and WebSentinel form the core, MCPSentinel can be enabled during the CLI wizard for specialized AI security testing.

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

To run a scan, you simply invoke the platform CLI and point it to your codebase and a running frontend URL:

```bash
node packages/platform/dist/cli.js scan \
  --project "my-startup" \
  --web "http://localhost:3000"
```

_For more detailed configuration options and rule customization, visit the [Documentation Website](./packages/docs)._

---

<div align="center">
  <i>Engineered for the next generation of AI applications.</i>
</div>
