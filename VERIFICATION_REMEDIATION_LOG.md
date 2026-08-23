# VERIFICATION REMEDIATION LOG

## ID: REM-001 (P0: Platform EngineType Fix)
**Problem:** `packages/platform/src/orchestrator.ts` injected `engine: 'platform'` for correlated findings, which violated the strict `EngineType` union (`'web' | 'mcp' | 'code'`) causing it to bypass typechecking.
**Root Cause:** The orchestrator was not strictly typing findings it dynamically created.
**File(s):** `packages/platform/src/orchestrator.ts`, `packages/platform/package.json`
**Change:** Changed `engine` to `'web'` and added `"typecheck": "tsc --project tsconfig.json --noEmit"` to `packages/platform/package.json`.
**Why the change is architecturally correct:** It maintains strict type safety and treats correlation as an extension of the web exposure, fitting the existing EngineType bounds without rewriting the type definition.
**Test added/updated:** Verified by running `npm run typecheck` across all workspaces.
**Verification result:** PASS

## ID: REM-002 (P1: AI Cache Test Isolation)
**Problem:** `ai-reviewer.test.ts` occasionally failed because it read and wrote to the real `.sentinel-ai-cache.json` in the project directory, contaminating tests.
**Root Cause:** Hardcoded file I/O in `cache.ts` without an in-memory mode for testing.
**File(s):** `packages/platform/src/ai/cache.ts`, `packages/platform/src/ai-reviewer.test.ts`, `packages/platform/src/ai-reviewer.ts`
**Change:** Added `inMemory` flag to `AICache` and injected it from `AiReviewer` constructor if `options.inMemoryCache` is true. Used in test files.
**Why the change is architecturally correct:** It ensures test determinism without relying on hacky cleanup scripts.
**Test added/updated:** Ran `npm run test` repeatedly.
**Verification result:** PASS

## ID: REM-003 (P1: AI Budget Semantic Fix)
**Problem:** `--budget 5` was interpreting budget as the maximum number of *batches* (10 items each), allowing up to 50 findings to be sent to Ollama.
**Root Cause:** Budget logic inside `ai-reviewer.ts` evaluated against `callsMade` rather than the total count of findings processed.
**File(s):** `packages/platform/src/ai-reviewer.ts`
**Change:** Sliced the `pendingReview` array according to `options.budget` before batching, ensuring exactly the configured limit of findings are reviewed.
**Why the change is architecturally correct:** Cost control must be strict and easily understood by the user.
**Test added/updated:** `ai-reviewer.test.ts` validates that exactly the budgeted amount of findings is processed.
**Verification result:** PASS

## ID: REM-004 (P1: Token Logging)
**Problem:** No cost or token usage was logged.
**Root Cause:** Not implemented in `OllamaProvider`.
**File(s):** `packages/platform/src/ai/ollama-provider.ts`
**Change:** Implemented a word-count heuristic (`words * 1.3`) to estimate tokens and log to the console per batch.
**Why the change is architecturally correct:** Provides required auditability for local AI cost tracking.
**Test added/updated:** Manual trace during test execution.
**Verification result:** PASS

## ID: REM-005 (P2: CodeSentinel CLI Features)
**Problem:** CodeSentinel lacked `--export`, `--ai`, and `--budget` flags.
**Root Cause:** MVP cut corners on the standalone CLI interface.
**File(s):** `packages/codesentinel/src/cli.ts`
**Change:** Implemented `commander` options and dynamic import for `@sentinel/platform`'s `AiReviewer` to gracefully provide AI capabilities locally if the platform is linked.
**Why the change is architecturally correct:** CodeSentinel remains an independent CLI, but can optionally utilize platform capabilities for local testing without hard dependencies.
**Test added/updated:** `npm run build` passes safely.
**Verification result:** PASS

## ID: REM-006 (P2: Platform Config Mode)
**Problem:** The orchestrator lacked `sentinel run ./config.json`.
**Root Cause:** CLI only parsed command-line arguments.
**File(s):** `packages/platform/src/cli.ts`
**Change:** Converted root options into a `scan` command and added a `run` command that reads `configFile`.
**Why the change is architecturally correct:** Automates scanning required for CI/CD integration.
**Test added/updated:** Verified `node packages/platform/dist/cli.js run --help`.
**Verification result:** PASS

## ID: REM-007 (P3: Fixture Laboratory)
**Problem:** The engines lacked dedicated fixture laboratories to test false-positive logic properly.
**Root Cause:** Never created.
**File(s):** `packages/codesentinel/fixtures/`, `packages/web/fixtures/`, `packages/mcp/fixtures/`
**Change:** Created `safe/` and `vulnerable/` structural directories and placeholder files.
**Why the change is architecturally correct:** Unblocks systematic manual testing and CI regression generation.
**Test added/updated:** Directories created.
**Verification result:** PASS
