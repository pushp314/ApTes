# AI IMPLEMENTATION AUDIT

## 1. Current Implementation Status
The current AI implementation resides primarily in `packages/platform/src/ai-reviewer.ts` as a monolithic class `AiReviewer`.

### What works:
- **OFF by default:** AI is disabled unless explicitly enabled via `options.enabled`. The CLI defaults to `false`.
- **Confidence filter:** The system successfully filters out high/medium confidence findings. Only `confidence === 'low'` findings are processed.
- **Basic Ollama integration:** There is a rudimentary `fetch` call to `http://localhost:11434/api/generate`.
- **Graceful failure:** If Ollama is unavailable or errors out, the system catches the error and returns the unmodified deterministic finding.
- **Tests:** `ai-reviewer.test.ts` exists and mocks the AI response, avoiding external dependencies during CI.

### What is missing / Architecture violations:
- **Provider Abstraction:** The `AiReviewer` class hardcodes provider logic (mock vs. ollama) rather than using a clean interface abstraction.
- **Batching:** The reviewer processes findings in a loop, resulting in `1 finding -> 1 AI request`. There is no batching mechanism.
- **Structured Output:** The prompt asks for a "brief answer" in natural language. It expects `{ response: string }` from the Ollama API but does not enforce a structured JSON schema for the internal AI reasoning (verdict, reason, impact).
- **Finding Mutation:** The AI reviewer mutates the deterministic `message` by prepending `[AI Reviewed]` and appending the AI insight. It does not separate the deterministic evidence cleanly from the AI assessment in a structured way (e.g., separate fields for `aiVerdict`, `aiReasoning` in the report).
- **Budget / Token Limits:** There is no hard budget limit (e.g., max 5 requests). A scan with 1,000 low-confidence findings will spam 1,000 Ollama requests.
- **Context Collector:** Context is limited to `finding.title` and `finding.message`. It does not collect surrounding source code or cross-engine context intelligently.
- **Secret Redaction:** There is zero secret redaction. If a finding contains an API key, it is sent to Ollama in plaintext.
- **Caching & Deduplication:** No cache exists. Rerunning a scan will re-analyze identical findings. No deduplication of identical root causes.

## 2. Security Risks
- **Secret Leakage:** As noted, sensitive data in finding evidence or messages is exposed to the local LLM. While local, this violates the requirement to redact secrets before sending payload.

## 3. Token / Cost Risks
- **Unbounded Loops:** Without a budget, batching, or caching, the scanner could overwhelm the local machine's GPU/CPU with hundreds of simultaneous or sequential inference requests, crashing the host or taking hours to complete.

## 4. Test Gaps
- There are no tests verifying that the budget is enforced.
- There are no tests verifying that structured output is parsed safely.
- There are no tests verifying secret redaction.
- There are no tests verifying batching mechanics.

## 5. Recommended Implementation Plan
The implementation should proceed in strict adherence to the 31-step criteria outlined in the Master Prompt. The immediate next steps are to design a clean Provider interface, implement Secret Redaction, build a Context Collector and Batching engine, enforce budgets, and parse structured JSON. See `implementation_plan.md` for the technical blueprint.
