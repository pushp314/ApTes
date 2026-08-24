# CLI Reference — Commands & Options

Sentinel provides a modern, Nmap-inspired CLI with short flags, interactive automated code remediation, security policy gatekeeping, and SARIF output.

## Installation

```bash
# Global install (recommended)
npm install -g @sentinel/platform

# Or link locally from the monorepo
npm link ./packages/platform
```

After installation, the `sentinel` command is available globally.

---

## Commands

### `sentinel scan [url]` *(Default Command)*

The primary command. Scans a web application, backend source code, and MCP server simultaneously.

**If no arguments are provided**, Sentinel launches the **Interactive Wizard** with Express Mode and Advanced Mode options.

#### Syntax
```bash
sentinel scan <url> [options]
```

#### Positional Argument
| Argument | Description |
| --- | --- |
| `url` | The URL of the web application to scan (e.g., `http://localhost:3000`). |

#### Short Flags (Nmap-Style)
| Short | Long | Description | Default |
| --- | --- | --- | --- |
| `-p` | `--project <id>` | Project ID for reports and correlation. | Auto-generated |
| `-m` | `--mcp <cmd>` | Command to start the backend MCP server. | — |
| `-y` | `--authorized` | Confirm legal authorization to test the targets. | `false` |
| `-c` | `--code <path>` | Path to backend source code for CodeSentinel. | — |
| `-A` | `--ai` | Enable Supercharged AI Auditing (Ollama/Gemini). | `false` |
| `-f` | `--format <fmt>` | Output format: `cli`, `json`, `html`, `md`, `sarif`. | `cli` |
| `-o` | `--out <file>` | Write output to a file. | — |
| `-E` | `--executive-report <dir>` | Generate AI executive HTML report in the given directory. | — |

#### CI/CD & DevSecOps Options
| Long | Description | Default |
| --- | --- | --- |
| `--diff [branch]` | Scan only files modified against a git branch (e.g. `main` or `HEAD~1`). | — |
| `--fail-on <severity>` | Fail with exit code `1` if vulnerabilities of this level or higher exist (`critical`, `high`, `medium`, `low`). | — |
| `--policy <path>` | Path to `sentinel.policy.json` file for fine-grained thresholds. | `sentinel.policy.json` |

---

### `sentinel fix <report.json>`

Interactively review and apply automated code remediations from a Sentinel JSON report.

```bash
# 1. Run scan and export JSON
sentinel scan http://localhost:3000 -y -c ./src -f json -o results.json

# 2. Launch interactive remediation engine
sentinel fix results.json

# Preview diffs without modifying files
sentinel fix results.json --dry-run

# Auto-apply all safe deterministic fixes in CI
sentinel fix results.json -y
```

---

### `sentinel tools`

Displays the complete catalog of all Sentinel CLI commands, engines, and pentest tools.

```bash
sentinel tools
```

---

### `sentinel ui`

Launch the local Web-based Mission Control Dashboard GUI on `http://localhost:3333`.

```bash
sentinel ui
```

---

### `sentinel dashboard`

Launch the interactive terminal TUI dashboard powered by `sentinel-py`.

```bash
sentinel dashboard
```

---

## SARIF Integration (GitHub Advanced Security)

Export findings in SARIF v2.1.0 to display inline vulnerability warnings directly on GitHub Pull Requests:

```yaml
# .github/workflows/security.yml
name: Sentinel Security Gate

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Sentinel
        run: npm install -g @sentinel/platform

      - name: Run Sentinel Scan
        run: sentinel scan http://localhost:3000 -y -c ./src --format sarif -o results.sarif

      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

---

## Security Policy File (`sentinel.policy.json`)

Define repository-wide security thresholds:

```json
{
  "failOn": "high",
  "maxCritical": 0,
  "maxHigh": 0,
  "maxMedium": 5,
  "minScore": 85
}
```
