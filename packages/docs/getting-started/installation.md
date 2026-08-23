# Installation

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Git** (for cloning)
- **Ollama** (optional, for AI features) — [Install Ollama](https://ollama.com/)

## 🚀 Method 1: 1-Line Universal Installer (Mac, Linux & Windows)

### 🍎 macOS & 🐧 Linux (Bash / Zsh)
```bash
curl -fsSL https://raw.githubusercontent.com/pushp314/ApTes/main/scripts/install.sh | bash
```

### 🪟 Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/pushp314/ApTes/main/scripts/install.ps1 | iex
```

---

## ⚡ Method 2: Zero-Install Instant Run (NPX)

Run Sentinel instantly without installing anything permanently:

```bash
# Launch the Web Mission Control GUI
npx @sentinel/platform ui

# Launch the Terminal Dashboard
npx @sentinel/platform dashboard
```

---

## 🐍 Method 3: Python Security Toolkit (pip / pipx)

Install the zero-dependency Python security tools directly:

```bash
# Instant run with pipx
pipx run sentinel-security dashboard

# Or install via pip
pip install sentinel-security
sentinel-py audit https://example.com
```

---

## 📦 Method 4: Clone & Build from Source

```bash
# Clone the repository
git clone https://github.com/pushp314/ApTes.git
cd ApTes

# Install dependencies and build
npm install
npm run build

# Link CLI globally
npm link ./packages/platform

# Verify installation
sentinel --help
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
