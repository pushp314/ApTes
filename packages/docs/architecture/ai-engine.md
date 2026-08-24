# AI Assist Engine

Sentinel features a sophisticated dual-provider AI engine that analyzes, triages, and explains security findings.

## Dual-Provider Architecture

Sentinel supports both Local and Cloud-based AI analysis:

1. **Local Mode (Ollama):** The default configuration uses a local `dolphin-llama3:latest` (or `llama3`) model via Ollama. This guarantees that your proprietary source code and vulnerability data never leave your machine.
2. **Cloud Mode (Google Gemini):** For extremely fast execution and the absolute lowest token usage, you can supply a Gemini API Key (`GEMINI_API_KEY`). The engine will instantly switch to using `gemini-1.5-flash`.

### Strict Token Minimization Strategy

When operating in Cloud Mode (Gemini), Sentinel goes to extreme lengths to minimize token consumption and reduce costs:
- **Low Temperature:** Model temperature is strictly locked to `0.1` to enforce deterministic, concise output and prevent "hallucination loops" or conversational filler.
- **Strict JSON Generation:** Instead of relying on conversational prompts to extract JSON, the AI Engine uses native `responseSchema` and `responseMimeType: 'application/json'` configurations, forcing the model to strictly output data without reasoning wrappers.
- **Redaction Pipeline:** Before *any* evidence is transmitted to an AI provider (local or cloud), the **SecretRedactor** intercepts the payload and scrubs API keys, AWS secrets, Stripe tokens, and JWTs, replacing them with generic placeholders like `[REDACTED_AWS_KEY]`.

## Context-Aware AI Copilot

Sentinel includes a full-screen, interactive **Mission Control Copilot**. This isn't a static chat box; it maintains a persistent `ContextCollector` history.

Features:
- **Memory:** The AI remembers your previous questions about the current audit.
- **Syntax Highlighting:** Output supports rich Markdown and code blocks for easy reading.
- **Forensic Inspection:** You can ask the Copilot to analyze specific HTTP Request/Response pairs caught by the pentesting engine.
