# Context Collector

To effectively triage a finding, the LLM needs context.

The Context Collector (`packages/platform/src/ai/context-collector.ts`) reads the file referenced in a finding's `location` string. To ensure the LLM's context window is not blown out by massive monolithic files, the collector applies limits.

## Context Limits
- It extracts the specific line referenced in the finding.
- It extracts a configurable window of lines *above* and *below* that line (typically 20 lines in either direction) to provide surrounding context without overwhelming the model.
