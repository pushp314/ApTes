---
layout: home

hero:
  name: "Sentinel"
  text: "Zero-Config, Zero-False-Positive Security for the AI Agentic Web."
  tagline: "The world's first Tri-Boundary Security Orchestrator. Deterministic AST + Dynamic DOM + MCP Introspection — all correlated in real-time."
  actions:
    - theme: brand
      text: 🚀 Get Started in 30 Seconds
      link: /getting-started/quick-start
    - theme: alt
      text: 📐 Architecture Deep-Dive
      link: /architecture/system-overview
    - theme: alt
      text: 🎯 For VCs & Professors
      link: /vision/the-problem

features:
  - title: "🔬 CodeSentinel (Static AST)"
    details: "Parses TS/JS/Python into abstract syntax trees for deterministic taint tracking. Multi-language parsing via ts-morph and tree-sitter. Zero regex false positives."
    icon: ⚡
  - title: "🕸️ WebSentinel (Dynamic DOM)"
    details: "Drives a headless Playwright browser to execute DOM manipulation, CSRF, and injection attacks in real-time. Discovers AI chat widgets and fuzzes them."
    icon: 🛡️
  - title: "🤖 MCPSentinel (Agentic Context)"
    details: "Connects to MCP servers via stdio transport. Safely introspects tool schemas for excessive privileges and known vulnerability patterns without execution."
    icon: 🧠
  - title: "🔗 Correlation Engine"
    details: "Fuses static vulnerabilities with dynamic exploits to output a single, high-confidence attack path. Eliminates 90% of false positives mathematically."
    icon: 🔄
  - title: "📈 Sub-Second AST Parsing"
    details: "Optimized V8 memory management. Parses 10,000+ nodes in milliseconds using strict garbage collection hints and chunking limits."
    icon: 🏎️
  - title: "🛡️ Self-Hosted & Deterministic"
    details: "Runs 100% locally. No code leaves your machine. Deterministic algorithms guarantee reproducible scans."
    icon: 🔒
---

## The Tri-Boundary Advantage

Traditional Application Security Testing (AST) tools suffer from two fatal flaws: **False Positives** (flagging safe code) and **Context Blindness** (missing how the frontend, backend, and AI interact).

Sentinel solves this by scanning across all three critical boundaries simultaneously:

<div class="features-grid">
  <div class="feature-card">
    <h3>1. The Code Boundary</h3>
    <p>CodeSentinel reads your source code using compiler-grade Abstract Syntax Trees (AST). It understands exactly how data flows from a user input to a database query without needing to run the code.</p>
  </div>
  <div class="feature-card">
    <h3>2. The Web Boundary</h3>
    <p>WebSentinel spins up a real Chromium browser via Playwright. It attempts to actively exploit the vulnerabilities CodeSentinel found by fuzzing the DOM, verifying if a theoretical bug is actually reachable.</p>
  </div>
  <div class="feature-card">
    <h3>3. The Agent Boundary</h3>
    <p>As applications adopt AI agents, MCPSentinel intercepts the Model Context Protocol (MCP) to ensure LLMs cannot be tricked into leaking sensitive workspace data or executing unauthorized tools.</p>
  </div>
</div>

## See it in Action

<pre class="mermaid" style="display: flex; justify-content: center; margin: 2rem 0; background: transparent;">
graph TD
    A[CodeSentinel: Finds SQLi in Backend] --> C{Correlation Engine}
    B[WebSentinel: Confirms SQLi via Frontend Form] --> C
    C -->|High Confidence Alert| D[Sentinel Report]
</pre>

> [!TIP]
> Ready to explore the internal architecture? Check out our [Architecture Deep Dive](/architecture/system-overview) or see how Sentinel destroys the competition in our [Benchmarks](/research/benchmarks).

<style>
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}
.feature-card {
  background: var(--vp-c-bg-soft);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  transition: transform 0.2s;
}
.feature-card:hover {
  transform: translateY(-5px);
  border-color: var(--vp-c-brand-1);
}
.feature-card h3 {
  margin-top: 0;
  color: var(--vp-c-brand-1);
}
</style>
