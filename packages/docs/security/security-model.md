# Security Model

Sentinel is a security analysis tool, and therefore it assumes it will operate in hostile or highly sensitive environments. Its core security model is based on **Isolation, Consent, and Local-First Execution**.

## Key Tenets

1. **Explicit Consent:** A scan cannot occur without the user explicitly asserting ownership via `--authorized`.
2. **Execution Boundaries:** Code targets are parsed (AST), not evaluated. MCP targets are introspected, not invoked. Web targets are crawled, not exploited.
3. **Network Boundaries:** Web targeting explicitly rejects internal metadata and private IPs.
4. **AI Boundaries:** Local Ollama models ensure code never leaves the machine. Local redactors ensure secrets never reach the LLM.
