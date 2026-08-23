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
    details: "Multi-language parser (TypeScript, JavaScript, Python) powered by ts-morph and tree-sitter. Cross-file taint tracking, NoSQL injection detection, IDOR analysis, logic contradiction detection, and config drift — all without executing your code."
  - title: "🌐 WebSentinel (Dynamic DOM)"
    details: "Playwright-powered headless browser crawler that discovers AI chat widgets, fuzzes them with LLM-generated adversarial payloads, intercepts network traffic, and validates security headers — all with built-in SSRF protection."
  - title: "🤖 MCPSentinel (AI Agent Audit)"
    details: "Connects to MCP servers via stdio transport. Safely introspects tool schemas for excessive privileges, destructive operations, and known vulnerability patterns without ever executing the tools."
  - title: "🎯 Zero False Positives"
    details: "The Platform Orchestrator mathematically correlates findings across all three engines. A vulnerability is only flagged as P0 when it is independently confirmed by the code AST, the live DOM network trace, AND the MCP tool schema."
  - title: "🤖 Supercharged AI (Ollama + Gemini)"
    details: "Optional local LLM integration generates 1-click git patches, executable exploit PoCs, intelligent fuzz payloads, business logic auditing, and VC-grade executive HTML reports — all with strict budget controls and secret redaction."
  - title: "⚡ Zero-Config CLI"
    details: "Express Mode auto-detects your project structure. Nmap-style short flags for power users. Interactive wizard with Gemini AI fallback. GitHub Action template for CI/CD. Just type 'sentinel' and go."
---

## Platform Status

| Engine / Component | Status | Languages | Key Capabilities |
| --- | --- | --- | --- |
| **CodeSentinel** | ✅ Production | TS, JS, Python | 15+ rules, cross-file taint tracking, config drift, payload mismatch |
| **WebSentinel** | ✅ Production | Any Web App | DOM crawling, AI widget fuzzing, header validation, cookie analysis |
| **MCPSentinel** | ✅ Production | Any MCP Server | Schema introspection, privilege analysis, tool classification |
| **Platform Orchestrator** | ✅ Production | — | Tri-boundary correlation, P0 attack path synthesis |
| **AI Assist (Ollama)** | ✅ Production | — | 1-click patches, PoC generation, executive reports |
| **AI Assist (Gemini)** | ✅ Production | — | Workspace analysis, command suggestion, cloud AI auditing |
| **Interactive CLI** | ✅ Production | — | Express Mode, Nmap flags, config file support |
| **CI/CD Integration** | ✅ Production | — | GitHub Action template, PR comment integration |
