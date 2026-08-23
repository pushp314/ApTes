# Orchestrator

The Platform Orchestrator (`runUnifiedPlatform` in `packages/platform/src/orchestrator.ts`) is the brain of the Sentinel tool. It is responsible for bridging the independent scanning engines.

## Key Responsibilities

1. **Security Gating:** The orchestrator will violently abort if the `authorizationConfirmed` flag is not passed (`--authorized` in the CLI). It enforces the consent boundary.
2. **Concurrent Initialization:** It executes the Code, Web, and MCP engines in parallel, awaiting their unified `Finding[]` returns.
3. **Correlation:** It runs multi-engine correlation logic to elevate findings that are dangerous together.
4. **AI Routing:** It controls the budget and routes low-confidence findings to the AI Assist module.
5. **Report Dispatch:** It forwards the finalized findings to the designated Reporter interface.

## Separation of Concerns

The Orchestrator itself does not run abstract syntax trees, nor does it spawn Playwright browsers. It relies strictly on the isolated engine packages, ensuring the platform remains modular.
