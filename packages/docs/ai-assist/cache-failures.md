# Cache & Failures

## Failure Handling

If the AI module fails for *any* reason, it **fails open**.
- **Ollama Unavailable:** The connection is refused.
- **Timeout:** The request takes longer than the internal `AbortController` timeout (e.g., 30s).
- **Malformed JSON:** The LLM hallucinates non-JSON text.

In all these scenarios, the original deterministic finding is preserved untouched. The user will still see the vulnerability; it simply won't have an AI triage score.

## Caching
*(Caching is planned but currently not implemented. Each run generates fresh LLM inference.)*
