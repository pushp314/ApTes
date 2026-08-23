# Threat Model

Sentinel is designed to mitigate attacks against its own infrastructure while auditing untrusted targets.

## SSRF Mitigation Sequence
The following diagram illustrates how WebSentinel defends against a malicious user attempting to use the scanner to probe an internal cloud metadata endpoint.

```mermaid
sequenceDiagram
    actor Attacker
    participant CLI as Sentinel CLI
    participant Web as WebSentinel
    participant DNS as DNS Resolver
    participant Target as Target URL (169.254.169.254)

    Attacker->>CLI: sentinel scan --web http://169.254.169.254
    CLI->>Web: Initialize Crawl
    Web->>DNS: Resolve Hostname
    DNS-->>Web: IP: 169.254.169.254
    Web->>Web: Check IP against SSRF Blocklist
    Web-->>CLI: ABORT: Targetting localhost/private IP is prohibited by SSRF protection.
    CLI-->>Attacker: Exit Code 1
```

## Secret Redaction Sequence
The following diagram illustrates how the `SecretRedactor` protects proprietary source code secrets from leaking to the LLM.

```mermaid
sequenceDiagram
    participant Engine as CodeSentinel
    participant Orchestrator
    participant Redactor as SecretRedactor
    participant AI as Local Ollama

    Engine->>Orchestrator: Finding: "sk-live-1234..."
    Orchestrator->>Redactor: Redact Context
    Redactor->>Redactor: Apply High-Entropy Regex
    Redactor-->>Orchestrator: Context: "[REDACTED_STRIPE_KEY]"
    Orchestrator->>AI: Evaluate Context: "[REDACTED_STRIPE_KEY]"
    AI-->>Orchestrator: JSON Patch
```

## Residual Risks


| Threat | Attack Surface | Mitigation | Residual Risk |
| --- | --- | --- | --- |
| **SSRF** | `--web` CLI argument | WebSentinel enforces strict IP blocklists. | High-entropy DNS rebinding attacks if the underlying OS resolver caches aggressively. |
| **RCE via Malicious MCP** | `--mcp` CLI argument | MCPSentinel only invokes `listTools`, and sandboxes the environment. | Target could still execute malicious payload upon startup (Node.js script execution). |
| **Secret Exfiltration** | `--ai` LLM Context | `SecretRedactor` masks high-entropy strings locally. | Unrecognized custom secret formats might leak to local Ollama logs. |
| **Malicious Code Execution** | `--code` CLI argument | CodeSentinel strictly parses ASTs and never uses `eval()` or requires the code. | None identified. |
