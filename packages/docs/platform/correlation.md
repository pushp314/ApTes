# Correlation

Security vulnerabilities do not exist in a vacuum. Sentinel's unique value proposition is **Cross-Engine Correlation**. The orchestrator inspects the collective findings from all engines to identify compounding risks.

## Implemented Correlation Rules

### 1. `platform-mcp-exposure` (P0 Attack Path)
**Trigger:**
- `WebSentinel` detects an AI widget (`ai-widget`).
- `CodeSentinel` detects a sensitive route missing authentication (`missing-auth`).
- `MCPSentinel` detects an unconstrained dangerous tool (`mcp-privilege-analysis`).

**Result:**
The platform synthesizes a new `CRITICAL` finding indicating a full chain: an unauthenticated external user can interact with an AI widget that calls an unconstrained backend MCP tool, potentially leading to RCE or data exfiltration.

### Future Extensibility
The correlation engine is designed to easily accommodate new multi-engine signatures by inspecting the `ruleId` arrays of the returned findings.
