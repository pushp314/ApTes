# The Core Problem

The enterprise attack surface has fundamentally shifted. Over the last decade, security tooling has siloed itself into hyper-specialized domains:

1. **Static Application Security Testing (SAST):** Looks exclusively at backend code (ASTs).
2. **Dynamic Application Security Testing (DAST):** Looks exclusively at live web applications (crawling).
3. **Cloud Security Posture Management (CSPM):** Looks exclusively at infrastructure.

## The Convergence of Web, Backend, and AI Agents

With the rise of Large Language Models (LLMs) and the **Model Context Protocol (MCP)**, agents are now being wired directly into backend systems. A modern enterprise application often looks like this:

- A public-facing Web frontend (React/Vue) hosting an AI Chat Widget.
- A Backend API (Node.js/Python) acting as a broker.
- A local MCP Server that executes tools on behalf of the AI (e.g., `execute_query`, `read_file`).

### The Silo Failure
If a developer forgets to add authentication middleware to the Backend API route serving the AI agent, **a SAST tool might flag a "missing authentication" warning.** 

However, SAST tools have high false-positive rates, so developers often ignore these warnings. The SAST tool *does not know* that the unauthenticated route is actively exposing an MCP Server capable of executing arbitrary SQL queries to a public web frontend.

Because security tools operate in silos, they miss the **P0 Attack Path**. The compounding risk of Web + Backend + Agent is invisible to traditional security pipelines.
