# SSRF Protection

Server-Side Request Forgery (SSRF) is a critical risk when a tool accepts a URL and makes automated requests. WebSentinel is designed to protect against weaponization.

## Enforcement Mechanism

Before WebSentinel navigates to a URL, it resolves the domain. It strictly blocks:
- `127.0.0.1` and `localhost`
- Private IPv4 ranges (e.g., `10.0.0.0/8`, `192.168.0.0/16`)
- Cloud metadata endpoints (e.g., `169.254.169.254`)

If the orchestrator detects an attempt to scan these without explicit permission, it aborts the scan immediately.

## Bypassing for Local Development

When testing local fixtures (like `http://localhost:8080`), you **must** supply the `--allow-local` flag to the orchestrator. This explicitly bypasses the SSRF filter for testing purposes only.
