# Introduction to Sentinel

Sentinel is a **unified, deterministic security analysis platform** built to audit modern applications across three distinct boundaries:
1. **Source Code** (Backend repositories)
2. **Web Applications** (Frontend deployments)
3. **Model Context Protocol (MCP) Servers** (AI integration layers)

## Why Sentinel Exists

Modern applications often blur the lines between frontend routing, backend business logic, and increasingly, AI-driven agents (MCP servers). Vulnerabilities rarely exist in a vacuum. For example, a missing authentication check in a backend API is dangerous, but if that API is exposing an MCP server capable of writing to the filesystem directly to an unauthenticated frontend, it creates a **P0 Attack Path**.

Sentinel was built to:
- **Scan all three layers** using dedicated, specialized engines.
- **Correlate findings** across layers to highlight compounded risks.
- **Enforce deterministic rules** as the immutable source of truth.
- **Provide AI-assisted triage** (optional) to reduce noise and generate remediation patches locally.

## Design Philosophy

Sentinel is governed by strict engineering principles:

1. **Source Code is the Source of Truth:** Documentation and intended behavior matter, but the implementation is the only reality. Sentinel analyzes actual behavior.
2. **Deterministic > AI:** AI is powerful but hallucinates. Sentinel relies on deterministic AST parsing, DOM crawling, and Schema analysis. AI is only used to triage "low confidence" signals identified by deterministic rules.
3. **Security First:** Sentinel protects the operator. Scans require explicit authorization, web targeting enforces SSRF protections, MCP servers run in `PATH`-only restricted environments, and secrets are redacted before touching an LLM.

## What Sentinel Is NOT

- Sentinel is **not** a full browser penetration-testing framework (like Burp Suite).
- Sentinel is **not** an active exploitation tool. It observes and introspects; it does not execute `callTool` on MCP servers.
- Sentinel is **not** a cloud SaaS. It is a local CLI tool designed to run securely within your perimeter.
