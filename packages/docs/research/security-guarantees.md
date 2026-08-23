# Formal Security Guarantees

As an automated security analysis platform, Sentinel inherently operates on untrusted, potentially malicious inputs (e.g., a vulnerable codebase or an exploited MCP server). 

To ensure the safety of the host machine executing the Sentinel Orchestrator, the platform provides several formal security guarantees enforced at the implementation level.

## 1. Non-Execution of Untrusted Code
The CodeSentinel engine guarantees that it **never executes** the code it is analyzing. It does not invoke `eval()`, `require()`, or `import()`. It relies entirely on static Abstract Syntax Tree (AST) construction via the TypeScript compiler API (`ts-morph`). 

## 2. Server-Side Request Forgery (SSRF) Mitigation
The WebSentinel crawler accepts arbitrary URLs. To prevent attackers from using Sentinel as an SSRF proxy to scan internal networks, the engine enforces a strict hostname blocklist prior to initiating any Playwright navigation context. 
- The regex blocklist specifically prohibits `localhost`, `127.0.0.1`, `169.254.169.254` (AWS/GCP metadata endpoints), and private IP subnet structures (`10.x.x.x`, `192.168.x.x`).

## 3. Strict MCP Subprocess Sandboxing
Model Context Protocol (MCP) servers are inherently capable of side-effects. When MCPSentinel connects to a local MCP target via standard I/O, it spawns the target subprocess in a highly constrained environment.
- The parent process environment (`process.env`) is explicitly stripped.
- The subprocess is provided a synthetic environment containing only the `PATH` variable necessary to resolve the executable (e.g., `node` or `python`).
- This guarantees that an exploited MCP server cannot trivially dump Sentinel's own environment variables (such as API keys or CI/CD tokens) from memory.

## 4. Provable Secret Redaction
Before any code context is dispatched to the AI Assist module, it passes through the `SecretRedactor`. This module applies high-entropy regex constraints (matching UUIDs, JWTs, Stripe keys, and AWS credentials) and replaces the matched byte sequences with deterministic placeholders. This ensures zero sensitive data leakage across the probabilistic boundary.
