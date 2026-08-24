# Mission Control Dashboard

Sentinel provides an elite, Tier-1 Enterprise Cybersecurity Web UI Dashboard called **Mission Control**.

## Launching the Dashboard

To launch the Web GUI, simply run:

```bash
npm run dashboard
# or
sentinel ui
```

This will automatically open your default browser to the Dashboard interface (powered by a Python FastHTML backend and a React/TypeScript frontend).

## The Interface

The interface features a strictly monochrome, black-and-white aesthetic designed for low-distraction, high-readability security engineering.

### 1. Multi-Stage Execution Pipeline
At the top of the interface, you'll see the execution pipeline stepper. This provides a visual representation of the Tri-Boundary Orchestrator's progress:
1. `DAST & RECON`
2. `AST & MCP`
3. `AI TRIAGE`
4. `REPORT`

### 2. Live Telemetry Stream
On the left pane of Mission Control, a real-time CLI terminal stream is embedded directly into the browser. You can watch exactly what the Python multi-threaded pentesting engine and the TS rules engines are doing at the network level.

### 3. Context-Aware AI Copilot
The UI contains a dedicated full-screen page for the **Threat Intelligence Copilot**.
- Provides syntax-highlighted code blocks for vulnerability patches.
- Remembers your conversational history context for the duration of the session.
- Features quick-prompt suggestion chips for rapid analysis.

### 4. Consolidated Findings Report
Once the pipeline reaches the `REPORT` stage, all correlated findings are displayed in a clean, filterable list. Critical and High severity findings are placed at the top, along with AI confidence scores indicating the likelihood of a false positive.
