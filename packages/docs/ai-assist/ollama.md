# Ollama Integration

The default AI provider is `OllamaProvider`. 

By default, Sentinel expects Ollama to be running on `http://localhost:11434`. It uses the `llama3` model for inference, which must be pulled locally (`ollama pull llama3`) before running a scan with `--ai`.

## Request Format

The provider strictly enforces JSON output via standard prompt engineering and JSON parsing of the response. The expected format is:

```json
{
  "isTruePositive": boolean,
  "confidenceScore": number,
  "explanation": string,
  "patch": string | null
}
```

If Ollama returns malformed JSON, Sentinel will catch the error and the finding will remain untriaged.
