# Budget & Batching

LLM inference is computationally expensive. Sentinel protects against unbounded AI execution using a strict `budget`.

## The Budget Limit

The `--budget` CLI flag defaults to `5`. 
This means Sentinel will only make a maximum of 5 requests to the AI provider per scan. Once the budget is exhausted, any remaining eligible findings are simply skipped and logged with `aiAssessment: undefined`.

## Request Lifecycle
The `AiReviewer` iterates over the `Finding[]` array. For each finding that meets the eligibility criteria (`confidence < HIGH`), it decrements the budget, performs context collection/redaction, and issues the request.
