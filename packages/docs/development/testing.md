# Testing & Fixtures

Sentinel relies heavily on deep fixtures rather than mocks to ensure accurate parsing and detection behavior.

## Fixture Locations
- **CodeSentinel:** `packages/codesentinel/fixtures/sample-project/src/` (Includes `safe/`, `vulnerable/`, and `borderline/`).
- **WebSentinel:** `packages/web/fixtures/` (Includes `healthy-site/`, `broken-links-site/`, `console-error-site/`, etc).
- **MCPSentinel:** `packages/mcp/fixtures/` (Includes `safe-server.js`, `vulnerable-server.js`).

## Writing a Test
If you add a new rule to CodeSentinel (e.g., `my-new-rule`), you must:
1. Create an example of the flaw in `vulnerable/`.
2. Create an example of the *correctly secured* pattern in `safe/`.
3. Ensure the scanner returns `0` findings for the safe directory.
