# Quick Start

This guide will walk you through running your first scan using the built-in vulnerability fixtures provided in the repository.

## 1. Setup

Ensure you have installed dependencies and built the project:
```bash
npm install
npm run build
```

## 2. Serve the Web Fixture
Sentinel's Web Engine requires a live URL. We provide a healthy (safe) fixture and various vulnerable fixtures. Start a local server for the `console-error-site` fixture:

```bash
python3 -m http.server 8081 -d packages/web/fixtures/console-error-site &
```

## 3. Run the Unified Scan

Use the Platform CLI to orchestrate a scan against a web URL, an MCP server, and a codebase simultaneously.

```bash
node packages/platform/dist/cli.js scan \
  --project quick-start-project \
  --web http://127.0.0.1:8081 \
  --mcp "node packages/mcp/fixtures/vulnerable-server.js" \
  --code packages/codesentinel/fixtures/sample-project/src/vulnerable/ \
  --authorized \
  --allow-local
```

### Explaining the Flags:
- `--project`: A unique identifier for this scan session.
- `--web`: The URL for the Web Engine to crawl.
- `--mcp`: The exact command to boot the local MCP server.
- `--code`: The local directory path for the Code Engine to parse.
- `--authorized`: **Required.** An explicit security gate confirming you have permission to test these targets.
- `--allow-local`: **Required for localhost.** Temporarily disables the SSRF protections that prevent Sentinel from scanning private/local network addresses.

## 4. Review the Output

The CLI will orchestrate the engines concurrently and output a unified report to `stdout`. You should see a list of findings categorized by engine, including:
- `[ENGINE: MCP]` findings for unbounded inputs.
- `[ENGINE: CODE]` findings for hardcoded secrets and SQL injection.
- `[ENGINE: WEB]` findings for unhandled console errors.
