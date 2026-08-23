# Data Flow

The following flows document exactly how data traverses through the engines during a scan.

## Code Scan

```text
Code Target Directory
 ↓
ts-morph Parser
 ↓
AST Node Traversal
 ↓
Deterministic Rules
 ↓
Finding[]
 ↓
Platform Orchestrator
 ↓
Report
```

## Web Scan

```text
Target URL
 ↓
SSRF Target Validation
 ↓
Playwright Crawler
 ↓
DOM Extraction & Event Listening
 ↓
Deterministic Rules
 ↓
Finding[]
 ↓
Platform Orchestrator
 ↓
Report
```

## MCP Scan

```text
MCP Server Command
 ↓
Subprocess (PATH-only sandbox)
 ↓
StdioClientTransport
 ↓
Introspection (listTools())
 ↓
Schema & Privilege Rules
 ↓
Finding[]
 ↓
Platform Orchestrator
 ↓
Report
```

## AI Flow

```text
Finding[]
 ↓
Eligibility Filter (Confidence < HIGH)
 ↓
Context Collector
 ↓
Secret Redactor
 ↓
Batch (up to Budget limit)
 ↓
Ollama (llama3)
 ↓
JSON Validation
 ↓
aiAssessment (including patch)
 ↓
Report
```
