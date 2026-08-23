# The Sentinel Solution

Sentinel is the first unified, tri-boundary security platform designed specifically for the AI era.

Instead of running separate tools and manually triaging thousands of noisy alerts, Sentinel orchestrates three specialized engines concurrently:

1. **CodeSentinel:** Statically parses the backend codebase (AST).
2. **WebSentinel:** Dynamically crawls the live frontend (DOM).
3. **MCPSentinel:** Introspects the exposed AI Agent capabilities (MCP Schema).

## The Correlation Engine

The true magic of Sentinel is its central **Platform Orchestrator**. 

Because Sentinel aggregates the findings from all three boundaries in real-time, it can perform mathematical correlation. It connects the dots that siloed tools miss.

**Example P0 Signature:**
If Sentinel detects:
1. `ai-widget` on the frontend (Web)
2. `missing-auth` on the backend route (Code)
3. `execute_query` capability with unbounded parameters on the agent (MCP)

Sentinel's correlation engine automatically synthesizes these three isolated, medium-severity warnings into a single **CRITICAL P0 Alert:** *Unauthenticated public access to arbitrary database execution.*

## Deterministic Foundation, Probabilistic Edge

Sentinel does not rely on LLMs to find vulnerabilities. LLMs hallucinate, and relying on them for primary detection creates unacceptable liability for enterprises.

Sentinel's primary engines are **100% deterministic** (Regex, DOM parsing, AST traversal). We only use AI (a local Ollama model) as an *optional* final step to triage low-confidence signals, reducing developer fatigue without compromising the ground truth of the scan.
