# System Overview

<div class="video-placeholder">
  <div class="video-overlay">
    <span class="play-icon">▶</span>
    <p>Watch: Architecture Deep-Dive (12 mins)</p>
  </div>
</div>

Sentinel is designed as a modular security platform consisting of three primary engines (Code, Web, Recon) coordinated by a central orchestrator, with an optional AI augmentation and Agent security module (MCP).

## High-Level Architecture

```mermaid
flowchart TD
    subgraph DeveloperInterface ["Developer Interface"]
        CLI["sentinel CLI (Commander.js)"]
        WIZARD["Interactive Wizard (@clack/prompts)"]
        CONFIG["sentinel.config.json"]
        GHA["GitHub Action"]
    end

    CLI --> Platform
    WIZARD --> Platform
    CONFIG --> Platform
    GHA --> Platform

    subgraph Platform["Platform Orchestrator (@sentinel/platform)"]
        ORCH[Orchestrator]
        CORR[Correlation Engine]
        AIR[AI Reviewer]
        REP[Reporters]
    end

    subgraph Engines["Analysis Engines"]
        CS["CodeSentinel\n(ts-morph + tree-sitter)"]
        WS["WebSentinel\n(Playwright)"]
        RS["ReconSentinel\n(Nmap, Nuclei)"]
        MS["MCPSentinel\n(Optional)"]
    end
    
    ORCH --> CS
    ORCH --> WS
    ORCH --> RS
    ORCH -.-> MS
    
    CS --> SHARED["@sentinel/shared\n(Finding Model)"]
    WS --> SHARED
    RS --> SHARED
    MS -.-> SHARED
    
    SHARED --> CORR
    CORR --> AIR
    
    subgraph AI["AI Providers"]
        OLLAMA["Ollama (Local)"]
        GEMINI["Gemini API (Cloud)"]
    end
    
    AIR --> OLLAMA
    AIR --> GEMINI
    AIR --> REP
    
    subgraph Output
        CLIR["CLI Report"]
        JSON["JSON Export"]
        HTML["HTML Dashboard"]
        MD["Markdown (CI/CD)"]
        EXEC["Executive Report"]
    end
    
    REP --> CLIR
    REP --> JSON
    REP --> HTML
    REP --> MD
    REP --> EXEC
```

## Core Components

### 1. The Orchestrator (`@sentinel/platform`)
The single entry point that manages the entire scan lifecycle. It:
- Parses CLI arguments or config files.
- Launches all three engines concurrently using `Promise.allSettled()`.
- Aggregates `Finding[]` arrays from each engine into a unified report.
- Runs the Correlation Engine to synthesize P0 attack paths.
- Passes low-confidence findings to the AI Reviewer.
- Generates reports in multiple formats.

### 2. The Engines
Three primary vulnerability scanners operate on distinct domains, plus one optional agent engine:

| Engine | Domain | Technology | Input | Output |
| --- | --- | --- | --- | --- |
| **CodeSentinel** | Source Code (AST) | `ts-morph`, `tree-sitter` | Directory path | `Finding[]` |
| **WebSentinel** | Live Web App (DOM) | `Playwright` | URL | `Finding[]` |
| **ReconSentinel**| Network Attack Surface | `Nmap`, `Nuclei` | Hostname/IP | `Finding[]` |
| **MCPSentinel** (Opt-in) | AI Tool Server | `@modelcontextprotocol/sdk` | Command | `Finding[]` |

They share no internal state. Each engine outputs a standard `Finding[]` array defined in `@sentinel/shared`.

### 3. Shared Core (`@sentinel/shared`)
The single source of truth for:
- `Finding` interface (the universal vulnerability record)
- `Severity` enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`)
- `Confidence` enum (`HIGH`, `MEDIUM`, `LOW`)
- `AiAssessment` interface (AI triage results)
- `UnifiedReport` interface (scan results container)

### 4. AI Assist (`@sentinel/platform/ai`)
An optional layer that intercepts low-confidence findings and passes them to Ollama (local) or Gemini (cloud) for:
- Verdict assessment (confirmed/dismissed)
- 1-click patch generation
- Exploit PoC generation
- Executive summary generation

---

## Zero False Positives: Exact Path Correlation

The true power of Sentinel is its ability to **mathematically prove** an attack path by correlating data across all three primary engines.

```mermaid
sequenceDiagram
    participant Recon as ReconSentinel (Nmap)
    participant Orchestrator as Platform Orchestrator
    participant Web as WebSentinel (Playwright)
    participant Code as CodeSentinel (AST)

    Recon->>Recon: Scan Target Ports
    Recon->>Orchestrator: Port 8080 exposed (HTTP)

    Web->>Web: Crawl http://localhost:8080
    Web->>Orchestrator: Found missing security headers

    Code->>Code: Trace AST from HTTP sink to Source
    Code->>Orchestrator: Route handler missing Auth Middleware

    Orchestrator->>Orchestrator: Correlate: Recon Open Port == Web Missing Headers == Code Missing Auth
    Orchestrator-->>Developer: 🚨 P0 Attack Path (Critically Exposed Unauthenticated Service)
```

### Why This Is Revolutionary

Traditional scanners operate in isolation. A SAST tool might flag "missing auth" with 50% confidence. A DAST tool might find an exposed endpoint. But neither can prove the full attack chain. Sentinel can, because it correlates all three boundaries simultaneously:

| Boundary | Finding | Standalone Confidence | Correlated Confidence |
| --- | --- | --- | --- |
| Recon | Port 8080 exposed and serving HTTP | LOW | — |
| Web | Missing strict security headers on 8080 | LOW | — |
| Code | Route handler missing authentication | HIGH | — |
| **Correlated** | **Full attack path: Exposed port serving unauthenticated route logic** | — | **CRITICAL (P0)** |
