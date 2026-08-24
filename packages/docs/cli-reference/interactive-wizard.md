# Interactive CLI Wizard

Sentinel provides an incredibly easy-to-use, interactive CLI wizard powered by `@clack/prompts`. To start it, simply run:

```bash
sentinel
```

Without any arguments, Sentinel launches the interactive setup wizard.

## Setup Modes

### 1. 🚀 Express Mode (1-Click, Auto-Detect)
Express Mode is designed for maximum speed. It will:
- Auto-detect your backend framework and start command (e.g., `npm start`, `node server.js`).
- Option to ask Gemini AI to analyze your workspace to guess the start command.
- Prompt for your Web Application URL.
- Automatically save configurations to `sentinel.config.json` for 1-click runs in the future.

### 2. ⚙️ Advanced Mode
Advanced Mode allows you to manually override every option:
- MCP Backend targets.
- Local Source Code paths.
- Supercharged Local AI (Ollama) settings.
- Explicit Legal Authorization checks.

## Granular Progress Tracking

When Sentinel runs, it no longer leaves you guessing. The CLI features a dynamic visual loader that provides real-time progress updates:
- **Estimated Time:** Calculates an ETA (e.g., `~5-10s`) depending on target latency and AI provider speed.
- **Active Operations:** Shows the exact engine currently executing (e.g., `◒ Starting Web Engine scan for target: https://appnity.co.in`).

## Running with Arguments

For CI/CD pipelines or rapid execution, you can bypass the wizard by providing arguments directly:

```bash
sentinel scan https://appnity.co.in -y
```

> **Note:** If you forget the `-y` authorization flag, the CLI will safely pause and prompt you for legal authorization instead of failing!
