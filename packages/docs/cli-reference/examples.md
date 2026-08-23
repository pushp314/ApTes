# CLI Examples

## Standard Unified Scan
```bash
sentinel scan \
  --project my-app \
  --web https://production.example.com \
  --mcp "node /opt/mcp/server.js" \
  --code /opt/src/backend \
  --authorized
```

## Local Development Fixture Scan
*(Requires `--allow-local` to bypass SSRF protections).*
```bash
sentinel scan \
  --project fixture-test \
  --web http://127.0.0.1:8080 \
  --mcp "node test-server.js" \
  --code ./src \
  --authorized \
  --allow-local
```

## AI-Assisted Auto-Remediation
*(Enables Ollama, budget of 10).*
```bash
sentinel scan \
  --project ai-test \
  --web https://staging.example.com \
  --mcp "node agent.js" \
  --authorized \
  --ai \
  --budget 10
```
