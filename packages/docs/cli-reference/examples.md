# CLI Usage Examples

Real-world examples showing how to use Sentinel in different scenarios.

---

## Example 1: Scanning a Node.js + Express Backend

You have a standard Express.js backend in `./src` with a frontend running at `http://localhost:3000`.

```bash
sentinel scan http://localhost:3000 \
  -m "node src/server.js" \
  -y \
  -c ./src \
  --allow-local
```

**What happens:**
- WebSentinel crawls `http://localhost:3000` looking for missing headers and AI widgets.
- CodeSentinel parses `./src` for injection risks, IDOR, and missing auth.
- MCPSentinel starts `node src/server.js` and introspects its MCP tools.
- The Orchestrator correlates all findings.

---

## Example 2: Python Flask + Docker Project

```bash
sentinel scan http://localhost:5000 \
  -m "docker-compose up" \
  -y \
  -c ./app \
  --allow-local \
  -A
```

CodeSentinel will use `tree-sitter` to parse `.py` files and detect `eval()` injections.

---

## Example 3: Generating a VC-Grade Executive Report

```bash
sentinel scan https://staging.myapp.com \
  -m "node backend/server.js" \
  -y \
  -c ./backend \
  -A \
  -E ./audit-reports
```

This generates a beautiful HTML dashboard in `./audit-reports/` with:
- Vulnerability count by severity
- An AI-generated executive summary
- Scan metadata and timing

---

## Example 4: CI/CD with GitHub Actions

Create `.github/workflows/sentinel.yml`:

```yaml
name: Sentinel Security Audit
on: [pull_request]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @sentinel/platform
      - run: sentinel run sentinel.config.json --format md > report.md
      - name: Post to PR
        uses: mshick/add-pr-comment@v2
        with:
          message-path: report.md
```

---

## Example 5: JSON Output for Custom Integrations

```bash
sentinel scan http://localhost:3000 \
  -m "node server.js" \
  -y \
  -f json \
  -o findings.json
```

The `findings.json` file contains the full `UnifiedReport` object with all engine findings, scores, and timing metadata — perfect for ingesting into Jira, Slack, or a custom dashboard.
