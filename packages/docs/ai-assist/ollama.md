# Ollama Integration

Sentinel uses [Ollama](https://ollama.com/) as its primary local AI provider. Ollama runs LLMs like Llama 3 entirely on your machine, ensuring **zero data exfiltration**.

## Setup

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull the Model
```bash
ollama pull llama3
```

### 3. Start the Server
```bash
ollama serve
# Ollama API available at http://localhost:11434
```

### 4. Run Sentinel with AI
```bash
sentinel scan http://localhost:3000 -m "node server.js" -y -A
```

## How Sentinel Talks to Ollama

Sentinel sends a structured JSON prompt to the `POST /api/generate` endpoint:

```json
{
  "model": "llama3",
  "prompt": "<structured security prompt with redacted findings>",
  "format": "json",
  "stream": false
}
```

The prompt explicitly requests a JSON response matching the `AiAssessment` schema, including `verdict`, `confidence`, `reason`, `patch` (unified diff), and `poc` (exploit script).

## Token Budget

Each scan has a configurable AI budget (default: 5 requests). This prevents runaway costs when scanning large projects with hundreds of findings. Only LOW and MEDIUM confidence findings are sent to AI — HIGH confidence findings skip AI entirely since they are already deterministically verified.

## Model Recommendations

| Model | Size | Speed | Quality | Recommended For |
| --- | --- | --- | --- | --- |
| `llama3` | 4.7 GB | Fast | Good | Default, CI/CD |
| `llama3:70b` | 40 GB | Slow | Excellent | Deep audits |
| `codellama` | 3.8 GB | Fast | Good (code) | Code-focused scans |
| `mixtral` | 26 GB | Medium | Very Good | Complex logic analysis |
