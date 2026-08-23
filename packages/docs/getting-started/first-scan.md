# First Scan & Expected Output

When you run a scan, Sentinel aggregates the results into a unified CLI report. Let's look at what actually happens under the hood during this scan.

## The CLI Command
```bash
node packages/platform/dist/cli.js scan \
  --project test-scan \
  --web https://example.com \
  --mcp "node server.js" \
  --code ./src \
  --authorized
```

## What Happens Next

1. **Authorization Gate:** The Orchestrator checks for the `--authorized` flag. If missing, it immediately aborts.
2. **Engine Initialization:** 
   - `WebSentinel` boots Playwright and validates the URL against SSRF blocklists.
   - `MCPSentinel` boots `node server.js` inside a restricted environment (PATH only) and connects via stdio.
   - `CodeSentinel` boots `ts-morph` and indexes the AST of `./src`.
3. **Execution:** Engines execute deterministic rules in parallel.
4. **Correlation:** The orchestrator looks for matching signatures across engines (e.g., an exposed AI widget in `WebSentinel` correlating to an unauthenticated route in `CodeSentinel`).
5. **AI Triage (Optional):** If `--ai` is passed, low-confidence findings are sent to Ollama for review.

## Example Output Format

```text
========================================
    SENTINEL UNIFIED REPORT
========================================
Project: test-scan
Score:   0/100
Time:    3031ms
========================================

[ENGINE: MCP]
  [CRITICAL] Dangerous Capability with Unbounded Inputs: execute_query
             Tool exposes dangerous capabilities (execute, query, exec) but lacks strict input constraints, risking RCE or injection.
             Rule: mcp-privilege-analysis | Location: Tool: execute_query
             Fix: Restrict tools using tight string enums, regex patterns, or human-in-the-loop approvals.

[ENGINE: CODE]
  [CRITICAL] SQL Injection Risk
             Unsafe string interpolation or concatenation detected in a sensitive database call. This creates an injection vulnerability.
             Rule: injection-risk | Location: vulnerable.ts:48:3
             Fix: Use parameterized queries or prepared statements.

========================================
Found 2 total issue(s).
```
