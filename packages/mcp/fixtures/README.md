# MCP fixtures

All fixture servers are runnable stdio MCP servers and must be scanned only
with explicit authorization:

- `safe-server.js` exposes a bounded read-only status tool.
- `borderline-server.js` exposes an allowlisted network-style tool that should
  produce informational review evidence rather than a high-confidence risk.
- `vulnerable-server.js` starts the deliberately vulnerable test server used by
  the runner tests; it includes unsafe filesystem/network tools and a mock CVE
  signature.

They exist to validate detector coverage and false-positive behavior; never
reuse the vulnerable fixture as application code.
