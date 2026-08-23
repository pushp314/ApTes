# Secret Redaction

Before any finding data is sent to an LLM (Ollama or Gemini), Sentinel's `SecretRedactor` strips all sensitive information.

## Why Redaction Matters

Security scan results inherently contain sensitive data: API keys, database credentials, tokens, and passwords discovered in the codebase. Sending this raw data to an LLM — even a local one — creates unnecessary risk. Sentinel eliminates this risk entirely.

## How It Works

The `SecretRedactor` operates on the `evidence` field of each `Finding` before it is sent to the AI provider:

```typescript
// Before Redaction
{
  evidence: 'const API_KEY = "sk-abc123xyz456";'
}

// After Redaction
{
  evidence: 'const API_KEY = "[REDACTED]";'
}
```

### Redaction Patterns

| Pattern | Example | Redacted To |
| --- | --- | --- |
| AWS Access Keys | `AKIAIOSFODNN7EXAMPLE` | `[REDACTED]` |
| API Keys | `sk-abc123xyz456...` | `[REDACTED]` |
| Passwords in strings | `"myP@ssw0rd!"` | `[REDACTED]` |
| Bearer Tokens | `Bearer eyJhbGci...` | `[REDACTED]` |
| Connection Strings | `mongodb://user:pass@host` | `[REDACTED]` |
| Generic Secrets | Any value assigned to `password`, `secret`, `token`, `key` variables | `[REDACTED]` |

## Implementation

The redactor is implemented in `packages/platform/src/redactor.ts` and is automatically invoked by the `AiReviewer` before batching findings for LLM analysis. It is covered by 3 dedicated unit tests.
