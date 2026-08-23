# Secret Redaction

Sending context to an LLM (even a local one) carries the risk of embedding sensitive data into the model's chat history or logs.

## Mechanism

Before any context string is sent to Ollama, the `SecretRedactor` (`packages/platform/src/ai/secret-redactor.ts`) intercepts it.

1. It applies high-entropy regex patterns matching AWS Keys, JWTs, Stripe tokens, and generic secrets.
2. It replaces the sensitive string entirely with a placeholder (e.g., `[REDACTED_SECRET]`).
3. The LLM evaluates the *redacted* context.

This ensures zero secrets leave the boundary of the deterministic engine execution.
