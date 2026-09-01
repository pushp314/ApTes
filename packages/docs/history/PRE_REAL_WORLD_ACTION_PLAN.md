# PRE-REAL-WORLD ACTION PLAN

Based on the findings in `PRE_REAL_WORLD_VERIFICATION_AUDIT.md`, Sentinel requires the following remediation steps before manual testing or real-world use can begin.

## P0: Build Integrity & Test Failures
**1. Fix the Platform Type Error**
- **Issue:** `packages/platform/src/orchestrator.ts` injects `engine: 'platform'` for correlated findings. This violates the `EngineType` strict type.
- **Action:** Extend `EngineType` in `packages/shared/src/types.ts` to include `'platform'`, or change the correlated finding's engine property to `'web'` with a clear `category: 'correlation'`.
- **Action:** Add `packages/platform` to the root `package.json` `npm run typecheck` script workspace list.

**2. Fix Test Quality and Cache Contamination**
- **Issue:** `packages/platform/src/ai-reviewer.test.ts` fails because the AI budget is enforced per-batch rather than per-finding. Cache also contaminates test runs.
- **Action:** Change `AICache` to use an in-memory map or unique temporary files during unit tests to prevent cross-run pollution.

## P1: AI Policy Enforcement
**1. Fix the Budget Mechanism**
- **Issue:** `ai-reviewer.ts` increments `this.callsMade++` once per batch of 10. A budget of 5 allows 50 AI assessments.
- **Action:** Change the budget constraint to track `findingsReviewed` against the `budget`, ensuring `options.budget` represents the total number of findings passed to Ollama.

**2. Implement Token/Cost Logging**
- **Issue:** `OllamaProvider` does not estimate or log tokens.
- **Action:** Add a tokenizer estimator (or simple word-count heuristic for local models) and emit a console log or report metric detailing total token usage at the end of the AI run.

## P2: Missing MVP CLI Features
**1. CodeSentinel `--export` and `--ai` Flags**
- **Issue:** `packages/codesentinel/src/cli.ts` lacks the `--export` and `--ai` flags required by the architecture.
- **Action:** Implement `commander` options for `--export <path>`, `--ai`, and `--budget <number>`. Write the `Finding[]` array to the specified JSON file if `--export` is passed. Wire up `AiReviewer` for CodeSentinel.

**2. Platform Configuration File (`sentinel run ./config.json`)**
- **Issue:** The platform CLI only accepts arguments via `--project`, `--web`, and `--mcp`.
- **Action:** Add a command to load these targets from a `config.json` file.

## P3: Fixture Laboratory Implementation
**1. Build Missing Fixtures**
- **Issue:** `safe/`, `vulnerable/`, and `borderline/` directories are missing across all engines.
- **Action:** Create dedicated mock projects for CodeSentinel (with SQLi, XSS, API mismatches). Create dummy HTML pages and dummy MCP servers to test the Web and MCP engines effectively. Migrate inline unit-test strings to rely on these robust fixtures.
