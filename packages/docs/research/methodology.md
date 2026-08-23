# Architectural Methodology

Sentinel's architecture is rooted in a strict philosophical division between **Deterministic Logic** and **Probabilistic Inference**.

## The Fallacy of Pure LLM Scanners
Many modern academic and commercial proposals for AI-driven security scanners rely on feeding raw source code into Large Language Models (LLMs) and prompting the model to find vulnerabilities. This approach suffers from two fatal methodological flaws:
1. **Unbounded Context Windows:** Real enterprise codebases exceed the context limits of current LLMs, requiring lossy chunking strategies that destroy semantic references across files.
2. **Hallucination Variance:** Probabilistic models cannot guarantee reproducibility. A vulnerability found on Tuesday might be ignored on Wednesday due to floating-point drift or temperature variance.

## Sentinel's Hybrid Pipeline
Sentinel solves this by treating the LLM as a *filter*, not a *generator*.

### 1. Deterministic Extraction (The Generator)
Sentinel relies on mathematically sound, deterministic algorithms to build an internal representation of the target:
- **AST Parsing (`ts-morph`):** The Code engine traverses the Abstract Syntax Tree (AST) to track variable declarations, function signatures, and control flow. An AST does not hallucinate.
- **DOM Extraction (`playwright`):** The Web engine extracts the live Document Object Model and intercepts deterministic network events (e.g., `console.error` or HTTP 404s).
- **Schema Validation:** The MCP engine parses strict JSON schemas returned by `listTools()`.

### 2. Probabilistic Triage (The Filter)
Only after the deterministic engines have generated a discrete `Finding[]` array does Sentinel invoke the probabilistic model (Ollama). 

The LLM is provided with a narrow, highly constrained prompt: it is given the exact lines of code surrounding a heuristic match (e.g., a regex match for a secret) and asked to evaluate the *entropy* and *context* of that specific snippet to determine if it is a true positive.

This bipartite architecture ensures that Sentinel maintains 100% reproducibility for high-confidence rules while drastically reducing the false-positive rate for heuristic rules.
