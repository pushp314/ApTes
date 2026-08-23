# Installing Sentinel (Team & Friend Setup Guide)

Get Sentinel running on your Mac, Windows, or Linux laptop in under 60 seconds.

---

## ⚡ Quick 60-Second Automated Setup (Recommended)

Run the one-line setup command for your operating system. It automatically checks for Node.js/Python, provisions dependencies, builds all engines, and links the global `sentinel` command:

### 🍎 macOS & 🐧 Linux
Open Terminal and run:
```bash
curl -fsSL https://raw.githubusercontent.com/pushp314/ApTes/main/setup.sh | bash
```

### 🪟 Windows (PowerShell)
Open PowerShell as Administrator and run:
```powershell
iwr -useb https://raw.githubusercontent.com/pushp314/ApTes/main/setup.ps1 | iex
```

---

## 📦 Method 2: Manual Clone & Setup from GitHub

If you prefer to clone the repository manually:

```bash
# 1. Clone the repository
git clone https://github.com/pushp314/ApTes.git
cd ApTes

# 2. Run the interactive setup doctor
./setup.sh          # On Mac/Linux
# .\setup.ps1       # On Windows PowerShell
```

Or build manually:
```bash
npm install
npm run build
npm link ./packages/platform
```

---

## 🚀 How to Launch Sentinel on Your Laptop

Once setup is complete, you can open **any terminal window** from any directory and run:

### 1. Web Mission Control GUI (Browser Interface)
```bash
sentinel ui
```
👉 Open **`http://localhost:3333`** to test endpoints, audit headers/CORS/cookies, and view vulnerability findings with one click.

### 2. Interactive Terminal Dashboard (TUI Hub)
```bash
sentinel dashboard
```
👉 Displays a numbered ASCII menu to launch scans and security tools directly inside your terminal.

### 3. Full Tri-Boundary Application Scan
```bash
sentinel scan http://localhost:3000 -m "node server.js" -y -c ./src
```

### 4. Standalone Python Pentest Tools
```bash
# Discover API endpoints
sentinel-py endpoints https://example.com

# Multi-vector vulnerability audit
sentinel-py audit https://example.com
```

---

## 🧪 Verify Your Installation

```bash
# Verify global CLI is available
sentinel --help

# Run the automated test suite
npm test
# (Expected: 18 test files, 138 tests passed)
```
