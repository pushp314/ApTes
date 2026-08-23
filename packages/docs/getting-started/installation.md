# Installation

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Git** (for cloning)
- **Ollama** (optional, for AI features) — [Install Ollama](https://ollama.com/)

## Option 1: Global Install (Recommended)

```bash
npm install -g @sentinel/platform
```

After installation, the `sentinel` command is available globally. Run it from any project directory:

```bash
cd /path/to/your/project
sentinel
```

## Option 2: Clone & Build from Source

```bash
# Clone the repository
git clone https://github.com/pushp314/ApTes.git
cd ApTes

# Install all dependencies
npm install

# Build all packages
npm run build

# Link the sentinel command globally
npm link ./packages/platform

# Verify installation
sentinel --version
```

## Option 3: Local Development (No Global Install)

If you don't want to install globally, you can run the CLI directly:

```bash
node packages/platform/dist/cli.js scan http://localhost:3000 -m "node server.js" -y
```

## Setting Up AI Features (Optional)

### Ollama (Local LLM — Recommended)

```bash
# Install Ollama
brew install ollama          # macOS
# curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Pull the model
ollama pull llama3

# Start the server
ollama serve
```

Then add `-A` to any Sentinel command to enable AI features.

### Gemini (Cloud LLM)

No installation needed. When running the interactive wizard, select "Use Gemini AI" and paste your API key when prompted. Get a key at [ai.google.dev](https://ai.google.dev/).

## Verify Installation

```bash
# Check the CLI is available
sentinel --help

# Run the test suite
npm test

# Expected output: 13 test files, 105 tests passed
```
