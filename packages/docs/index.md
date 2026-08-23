---
layout: home

hero:
  name: "Sentinel"
  text: "Deterministic security analysis for code, web targets, and MCP systems."
  tagline: "Engineering-grade verification platform built on AST parsing, Playwright crawling, and MCP introspection."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/introduction
    - theme: alt
      text: View Architecture
      link: /architecture/system-overview

features:
  - title: 1. CodeSentinel
    details: Statically analyzes backend source code via AST parsing (ts-morph) to find hardcoded secrets, injection risks, and logic flaws without code execution.
  - title: 2. WebSentinel
    details: Dynamically crawls live frontend targets using Playwright. Automatically detects UI widgets, structural issues, and console errors while enforcing strict SSRF protections.
  - title: 3. MCPSentinel
    details: Connects to Model Context Protocol (MCP) servers via stdio transports. Safely introspects tools and schemas for excessive privileges and known vulnerabilities.
  - title: Unified Platform Orchestrator
    details: Coordinates scans across all three engines. Automatically identifies cross-engine P0 attack paths (e.g., vulnerable MCP tools exposed to an unauthenticated web frontend).
  - title: Local AI Assist (Optional)
    details: Uses Ollama to triages low-confidence findings and generate auto-fixing patches. Budgets and local-only secret redaction ensure security.
---

## Current Status

| Engine / Component | Implementation Status | Verified Against Fixtures | Note |
| --- | --- | --- | --- |
| **CodeSentinel** | ✅ Complete | Yes | Statically evaluates logic without code execution. |
| **WebSentinel** | ✅ Complete | Yes | Enforces localhost SSRF protections by default. |
| **MCPSentinel** | ✅ Complete | Yes | Introspection only. No `callTool` capability. |
| **Orchestrator** | ✅ Complete | Yes | Requires strict `--authorized` CLI gates. |
| **AI Assist** | ✅ Complete | Yes | Redacts secrets locally before sending to Ollama. |
