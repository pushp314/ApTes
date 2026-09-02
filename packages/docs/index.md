---
layout: home

hero:
  name: "Sentinel"
  text: "Zero-Config, Zero-False-Positive Security for the AI Agentic Web."
  tagline: "A unified correlation layer for the modern web. Deterministic AST + Dynamic DOM + Active Network Recon — fusing noisy scanners into single high-confidence attack paths."
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
    - theme: alt
      text: 🏢 Enterprise & SOC2
      link: /enterprise/overview

features:
  - title: "🔬 CodeSentinel (Static AST)"
    details: "Parses TS/JS/Python into abstract syntax trees for deterministic taint tracking. Multi-language parsing via ts-morph and tree-sitter. Zero regex false positives."
    icon: ⚡
  - title: "🕸️ WebSentinel (Dynamic DOM)"
    details: "Drives a headless Playwright browser to execute DOM manipulation, CSRF, and injection attacks in real-time."
    icon: 🛡️
  - title: "📡 ReconSentinel (Network & OSINT Recon)"
    details: "Wraps powerful industry scanners (Nmap, Nuclei, testssl.sh, Subfinder, theHarvester, Nikto, ffuf). Normalizes raw tool dumps into unified finding contracts."
    icon: 📡
  - title: "🔗 Correlation Engine"
    details: "Fuses static vulnerabilities, active recon, and dynamic exploits to output a single, high-confidence attack path. Eliminates 90% of false positives mathematically."
    icon: 🔄
  - title: "🤖 MCPSentinel (Optional AI Security)"
    details: "Connects to MCP servers to safely introspect tool schemas for excessive privileges. Fully opt-in for agentic applications."
    icon: 🧠
  - title: "🛡️ Self-Hosted & Deterministic"
    details: "Runs 100% locally. No code leaves your machine. Deterministic algorithms guarantee reproducible scans."
    icon: 🔒
---

## The Correlation Advantage

Traditional Application Security Testing (AST) tools suffer from two fatal flaws: **False Positives** (flagging safe code) and **Context Blindness** (missing how the frontend, backend, and network interact).

Sentinel solves this by scanning across all three critical boundaries and **correlating** the results:

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
    <h3>3. The Network Boundary</h3>
    <p>ReconSentinel runs active tools like Nmap and Nuclei. When it finds an open unauthenticated port, it correlates this with Web and Code findings to prove it is a real exposure.</p>
  </div>
</div>

## See it in Action

<pre class="mermaid" style="display: flex; justify-content: center; margin: 2rem 0; background: transparent;">
graph TD
    A[ReconSentinel: Finds exposed HTTP port 8080] --> C{Correlation Engine}
    B[WebSentinel: Finds missing security headers on 8080] --> C
    D[CodeSentinel: Finds missing Auth middleware] --> C
    C -->|High Confidence Alert| E[Sentinel Report]
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
