<div align="center">
  <h1>🛡️ Sentinel Security Platform</h1>
  <p><b>The Unified Correlation Layer for Modern Web Architectures</b></p>
  <p>
    <a href="https://github.com/pushp314/ApTes/actions/workflows/ci.yml"><img src="https://github.com/pushp314/ApTes/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
    <img src="https://img.shields.io/badge/Tests-164%20passing-brightgreen" alt="164 Tests Passing" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-informational" alt="Node.js 20+" />
    <img src="https://img.shields.io/badge/Telemetry-100%25%20Local-success" alt="Zero Cloud Telemetry" />
  </p>
</div>

---

## 🚀 Beyond Noisy Scanners: The Correlation Thesis

Modern engineering organizations are drowning in security alert fatigue:

- **Static Analysis (SAST)** flags hundreds of theoretical sinks in uncallable dead code paths.
- **Dynamic Scanners (DAST)** probe frontends blind to the underlying database schemas, backend routes, or data flow.
- **Network & OSINT Scanners** dump unreadable terminal walls and gigabytes of raw XML/JSON output.

**Sentinel rejects this paradigm.**

The raw output of individual security tools is not the product. The product is **mathematical correlation**. Sentinel acts as a deterministic orchestration layer that runs specialized engines across the stack—**Static Code Analysis (AST)**, **Dynamic Browser Testing (DOM)**, and **Active Network Reconnaissance**—and correlates their signals into verified, high-confidence exploit paths with zero false positives.

```
                  ┌─────────────────────────────────────────┐
                  │        Static Code Analysis (AST)       │
                  │   ts-morph • tree-sitter • Taint Sink   │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
┌───────────────────────────┐    ┌───────────┐    ┌───────────────────────────┐
│ Dynamic Browser DOM (DAST)│───▶│  SENTINEL │◀───│ Network & Reconnaissance  │
│ Playwright • Form Fuzzing │    │CORRELATION│    │ Nmap • Nuclei • testssl   │
│ DOM-to-Network Tracking   │    │  ENGINE   │    │ Subfinder • Nikto • ffuf  │
└───────────────────────────┘    └─────┬─────┘    └───────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    Verified High-Confidence Findings    │
                  │  SARIF • Executive PDF • Automated Fix  │
                  └─────────────────────────────────────────┘
```

---

## 🔗 Signature Capabilities: Multi-Engine Correlation

### 1. Code ↔ Web Schema & Drift Correlation

Traditional scanners never correlate live API responses with the client code consuming them. Sentinel statically parses the frontend client AST to determine expected response models, while WebSentinel dynamically captures the live network response:

- **Client Code (AST Expectation):** Statically expects `{ id: number, name: string, email: string }`.
- **Live Server (DOM Interception):** Dynamically returns `{ userId: number, fullName: string }`.
- **Sentinel Finding:** Deterministic **Schema Mismatch & Configuration Drift** (`category: 'drift'`). Prevents silent UI failures, type corruption, and broken contracts before production deployment.

### 2. Triple-Engine Exploit Chain Verification (`platform-exposed-service-no-auth`)

When an endpoint is flagged by multiple independent engines across boundaries, Sentinel proves a complete, reachable exploit chain:

1. **Recon Engine (`nmap`)** identifies an open, public TCP port running HTTP.
2. **Web Engine (`playwright`)** confirms missing authentication controls and security headers on that service.
3. **Code Engine (`ts-morph`)** traces backend routing to confirm missing authentication middleware.

- **Sentinel Finding:** Elevated to a verified **Critical P0 Attack Path** with zero false positive doubt.

### 3. Transport & Client Policy Drift (`platform-tls-and-header-drift`)

- **Recon Engine (`testssl.sh`)** detects deprecated cipher suites, expired certificates, or weak TLS 1.0/1.1 protocols.
- **Web Engine (`web`)** discovers missing HTTP Strict Transport Security (HSTS) and CSP headers in the client browser.
- **Sentinel Finding:** Fuses transport-layer weakness with client policy degradation into a unified remediation path.

### 4. Unmapped Attack Surface Discovery (`platform-unmapped-sensitive-endpoint`)

- Active fuzzing via **`ffuf`** and **`nikto`** discovers exposed internal administrative panels (`/admin`, `/metrics`, `/.env`).
- Correlated against CodeSentinel's static AST route manifest to flag shadow APIs or unauthenticated internal dashboards.

---

## 🧠 The Three Core Engines

### 🔬 1. CodeSentinel (Static AST Engine)

- **Deterministic Taint Analysis:** Traces variable taint across function arguments, module imports, and database sinks without regex guessing.
- **Multi-Language Support:** Compiler-grade AST parsing for TypeScript & JavaScript via `ts-morph` and Python via `tree-sitter`.
- **Built-in Vulnerability Detectors:** SQL Injection, NoSQL Injection, Server-Side Request Forgery (SSRF), IDOR, Prototype Pollution, Insecure Deserialization (Pickle/YAML), Unhandled Promises, and Hardcoded Secrets.

### 🕸️ 2. WebSentinel (Dynamic DOM Engine)

- **Headless Chromium Execution:** Driven via Playwright to simulate real user interactions and render client-side SPAs.
- **Active DOM & Form Fuzzing:** Automatically injects non-destructive tracking payloads into input forms, tracks network responses, and captures DOM states.
- **Security Policy Auditing:** Evaluates Content Security Policy (CSP), CORS reflection, Cookie flags (`SameSite`, `HttpOnly`, `Secure`), and mixed-content risks.

### 📡 3. ReconSentinel (Tool Integration & Normalization Engine)

Wraps and normalizes industry-standard offensive and defensive security tools into structured `Finding` contracts:

- **`nmap`**: TCP port enumeration and service version fingerprinting (`-sV`).
- **`nuclei`**: Template-based community CVE and vulnerability verification.
- **`testssl.sh`**: Comprehensive TLS/SSL cipher, protocol, and certificate auditing.
- **`subfinder`**: Passive DNS subdomain discovery and attack surface discovery.
- **`theHarvester`**: OSINT email exposure and external infrastructure indexing.
- **`nikto`**: Web server configuration auditing and dangerous file scanning.
- **`ffuf`**: High-speed endpoint fuzzing with safe, bounded default wordlists.

---

## 🏢 Enterprise Features

- **SIEM-Ready Structured Logging:** Built with `pino`. Emits clean, high-performance JSON logs in production environments (`JSON_LOGS=true` or `NODE_ENV=production`) for ingestion into Splunk, Datadog, or Elasticsearch.
- **Native SARIF 2.1.0 Export:** Fully compatible with GitHub Advanced Security, Azure DevOps, and GitLab CI (`--format sarif`). Findings display directly inline in Pull Request diffs.
- **Automated Code Remediations (`sentinel fix`):** Generates and applies deterministic unified diffs to automatically patch security header omissions and insecure configurations.
- **Docker & Air-Gapped Deployment:** Multi-stage production `Dockerfile` and turnkey `docker-compose.yml` for self-hosted, offline enterprise deployments.
- **Git Hooks & Quality Gates:** Enforced pre-commit linting, Prettier formatting, and Conventional Commits (`husky` + `lint-staged` + `commitlint`).

---

## 🤖 Optional: AI Agent & MCP Security (Opt-in)

Sentinel includes an optional, fully isolated **MCPSentinel** engine for organizations deploying AI agents:

- **What it does:** Audits [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers for unbounded filesystem access, unsafe shell execution, and capability sprawl.
- **Explicitly Opt-in:** The core platform never runs or touches MCP unless explicitly requested via `--mcp "<command>"` or the interactive setup wizard (`mcpEnabled: false` by default).

---

## ⚡ Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/pushp314/ApTes.git
cd ApTes

# Install dependencies (configures Husky hooks automatically)
npm install

# Install Playwright browser dependencies (for web DOM testing)
npx playwright install --with-deps chromium

# Compile all monorepo packages
npm run build
```

### 2. Run a Unified Scan

```bash
# Unified scan against local source code and target web service
node packages/platform/dist/cli.js scan https://example.com -c ./src -y

# Export results to SARIF for GitHub Code Scanning
node packages/platform/dist/cli.js scan https://example.com -c ./src -y --format sarif --out results.sarif

# Enforce CI/CD build gate (exit code 1 on high/critical findings)
node packages/platform/dist/cli.js scan https://example.com -c ./src -y --fail-on high
```

### 3. Interactive Zero-Config Wizard

If you run Sentinel with no arguments, it launches the interactive express wizard:

```bash
node packages/platform/dist/cli.js
```

### 4. Interactive Dashboards & GUIs

```bash
# Launch the Web-based Mission Control GUI
npm run ui

# Launch the Terminal TUI Dashboard
npm run dashboard
```

---

## 🧪 Testing & Verification

Sentinel maintains strict testing discipline with fixture-backed unit tests that run deterministically in CI:

```bash
# Run all unit and integration tests (164 passing tests across 28 test suites)
npm test

# Run tests with V8 code coverage report
npm run test:coverage

# Static type check across all monorepo packages
npm run typecheck

# Lint all packages
npm run lint
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
