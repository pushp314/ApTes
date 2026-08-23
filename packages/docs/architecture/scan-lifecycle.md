# Scan Lifecycle

The `Platform Orchestrator` manages a strict pipeline when executing a unified scan.

```mermaid
sequenceDiagram
    participant CLI
    participant Config as Configuration
    participant Platform as Orchestrator
    participant Engines as Web/MCP/Code
    participant AI as AI Assist
    participant Report as Reporters

    CLI->>Config: Parse Flags (--web, --mcp, etc)
    Config->>Platform: runUnifiedPlatform()
    Platform->>Platform: Verify --authorized Gate
    Platform->>Engines: Execute Scanners (Concurrent)
    Engines-->>Platform: Return Finding[]
    Platform->>Platform: Normalize & Correlate Findings
    alt AI Enabled
        Platform->>AI: Send Low Confidence Findings
        AI-->>Platform: Return AI Assessment & Patches
    end
    Platform->>Report: Generate JSON/HTML/CLI Report
    Report-->>CLI: Output Result
```

## Steps

1. **Gate Verification:** The scan immediately terminates if `--authorized` is not passed.
2. **Target Validation:** SSRF checks are applied to URLs.
3. **Concurrent Execution:** Engines run in parallel using `Promise.all()`.
4. **Correlation:** The orchestrator looks for matching conditions across outputs (e.g. `platform-mcp-exposure`).
5. **Reporting:** Findings are dumped to the selected reporters.
