# Secret Handling

CodeSentinel identifies hardcoded secrets (e.g., `sk-123...`) in your source code.

## The Risk
If the AI Assist module is enabled, sending the line of code containing the plaintext secret to an LLM exposes that secret to the model's history, logs, or external APIs.

## The Redaction Pipeline
The `SecretRedactor` runs **before** the AI context is dispatched. It masks matched secrets with a generic placeholder.

*Note: While Sentinel redacts secrets before sending them to the LLM, the raw JSON report produced by Sentinel will still contain the secret in the `evidence` field, as it is the deterministic output. You must secure the `.json` report appropriately.*
