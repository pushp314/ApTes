# MANUAL VERIFICATION TEST PLAN

Now that the automated verification baseline is fully verified and clean, manual testing is authorized.

Execute the following test cases manually:

## 1. CodeSentinel Determinism
- **Target:** `packages/codesentinel/fixtures/vulnerable/index.ts`
- **Command:** `node packages/codesentinel/dist/cli.js scan ./packages/codesentinel/fixtures/vulnerable --export findings.json`
- **Expected:** Finding JSON exported containing the SQL injection rule failure.

## 2. Platform Orchestration & Correlation
- **Setup:** Launch a dummy web server running `packages/web/fixtures/index.html`. Launch a dummy MCP server pointing to `packages/mcp/fixtures/server.json`.
- **Command:** `node packages/platform/dist/cli.js scan --project test-1 --web http://localhost:8080 --mcp "node server.js"`
- **Expected:** Platform executes Web, then MCP, and successfully dumps a CLI report combining the results.

## 3. Platform AI Constraints
- **Setup:** Run the platform scan targeting a repository known to generate 50+ low-confidence findings.
- **Command:** `node packages/platform/dist/cli.js scan --project test-1 --web http://localhost:8080 --mcp "node server.js" --ai --budget 15`
- **Expected:** The console logs `[Sentinel AI] Budget exhausted (15). Skipping remaining 35 findings.` Token counts are logged exactly twice (1 batch of 10, 1 batch of 5).

## 4. Config Mode
- **Setup:** Create `config.json` containing targets.
- **Command:** `node packages/platform/dist/cli.js run ./config.json --format md --out report.md`
- **Expected:** Execution completes automatically and `report.md` is populated.

Once these test cases pass, the repository will officially enter the REAL-WORLD VALIDATION phase.
