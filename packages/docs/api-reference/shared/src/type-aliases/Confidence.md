[**sentinel**](../../../README.md)

***

# Type Alias: Confidence

> **Confidence** = `"high"` \| `"low"`

Finding confidence level.

- high: The engine is confident this is a real issue (deterministic detection).
- low:  The engine suspects an issue but cannot prove it with certainty.
        Low-confidence findings are the only category eligible for optional
        AI-assisted triage (when AI is explicitly enabled).
