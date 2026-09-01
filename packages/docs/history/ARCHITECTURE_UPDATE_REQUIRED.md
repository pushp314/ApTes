# Architecture Update Required

During the AI + MVP Verification Audit, several minor documentation drifts were identified.

## 1. Engine Interface Typo
- **Current statement:** `Sentinel_Combined_Architecture_Spec.md` uses `engineType: "web" | "mcp" | "code"` in the `Finding` interface.
- **Actual implementation:** The TypeScript `Finding` interface strictly uses `engine`.
- **Why they differ:** Typo in the spec document.
- **Recommended correction:** Change `engineType` to `engine` in the architecture spec.
- **Target:** Architecture Document.

## 2. AI Budget Semantic Meaning
- **Current statement:** Document states `--budget` limits "maximum number of AI requests per scan".
- **Actual implementation:** In `ai-reviewer.ts`, `budget` enforces the maximum number of *batches* sent to the AI provider. Because a batch is 10 items, `--budget 5` allows 50 findings to be analyzed. 
- **Why they differ:** Batching was introduced to optimize token context, decoupling "request count" from "finding count".
- **Recommended correction:** Update CLI help text and documentation to specify `--budget` limits the "number of batch requests (max 10 findings per batch)".
- **Target:** Architecture Document & CLI `help` string.