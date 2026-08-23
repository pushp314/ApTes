#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Sentinel Smart Interactive Setup & Environment Doctor
# Cross-Platform Environment Doctor & Automated Dependency Provisioner (macOS & Linux)
# ==============================================================================

set -e

# Terminal Styling
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
BLUE="\033[34m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"

clear 2>/dev/null || true

echo -e "${BLUE}${BOLD}"
echo "  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     "
echo "  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     "
echo "  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     "
echo "  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     "
echo "  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗"
echo "  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
echo -e "      ${CYAN}🛡️  INTERACTIVE SETUP & ENVIRONMENT PROVISIONER${RESET}\n"

echo -e "${BOLD}Checking system prerequisites and dependencies...${RESET}\n"

# 1. Check OS
OS_TYPE="$(uname -s)"
echo -e "  🖥️  Operating System: ${GREEN}$OS_TYPE ($(uname -m))${RESET}"

# 2. Check Git
if command -v git >/dev/null 2>&1; then
    echo -e "  ✅ Git: ${GREEN}$(git --version)${RESET}"
else
    echo -e "  ⚠️  ${YELLOW}Git is not installed.${RESET}"
    read -p "  Would you like to install Git? [y/N]: " install_git
    if [[ "$install_git" =~ ^[Yy]$ ]]; then
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            xcode-select --install || true
        elif command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y git
        fi
    fi
fi

# 3. Check Python 3
HAS_PYTHON=false
if command -v python3 >/dev/null 2>&1; then
    PY_VER="$(python3 --version)"
    echo -e "  ✅ Python 3: ${GREEN}$PY_VER${RESET}"
    HAS_PYTHON=true
else
    echo -e "  ⚠️  ${YELLOW}Python 3 not detected.${RESET}"
    read -p "  Install Python 3? [y/N]: " install_py
    if [[ "$install_py" =~ ^[Yy]$ ]]; then
        if [[ "$OS_TYPE" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
            brew install python3
            HAS_PYTHON=true
        elif command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update && sudo apt-get install -y python3 python3-pip
            HAS_PYTHON=true
        fi
    fi
fi

# 4. Check Node.js & npm
HAS_NODE=false
if command -v node >/dev/null 2>&1; then
    NODE_VER="$(node -v)"
    echo -e "  ✅ Node.js: ${GREEN}$NODE_VER${RESET}"
    HAS_NODE=true
else
    echo -e "  ⚠️  ${YELLOW}Node.js is not installed (required for AST analysis & Web GUI).${RESET}"
    read -p "  Would you like to install Node.js (LTS)? [y/N]: " install_node
    if [[ "$install_node" =~ ^[Yy]$ ]]; then
        if [[ "$OS_TYPE" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
            brew install node
            HAS_NODE=true
        elif command -v apt-get >/dev/null 2>&1; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            HAS_NODE=true
        else
            echo -e "  👉 Install Node.js manually from: https://nodejs.org/"
        fi
    fi
fi

# 5. Build Workspace
echo -e "\n${CYAN}${BOLD}Installing workspace packages and building TypeScript engines...${RESET}"

if [ "$HAS_NODE" = true ]; then
    npm install
    npm run build
    echo -e "  ✅ ${GREEN}Built all packages successfully!${RESET}"

    # Offer to link CLI globally
    read -p $'\n  Would you like to link `sentinel` globally to your system PATH? [Y/n]: ' link_cli
    if [[ ! "$link_cli" =~ ^[Nn]$ ]]; then
        npm link ./packages/platform --silent 2>/dev/null || {
            mkdir -p "$HOME/.sentinel/bin"
            ln -sf "$(pwd)/packages/platform/dist/cli.js" "$HOME/.sentinel/bin/sentinel"
            echo -e "  ✅ ${GREEN}Linked binary to $HOME/.sentinel/bin/sentinel${RESET}"
        }
        echo -e "  ✅ ${GREEN}Global command \`sentinel\` is ready!${RESET}"
    fi
else
    echo -e "  ℹ️  ${YELLOW}Node.js skipped. You can still run the standalone Python security tools.${RESET}"
fi

# 6. Check for Ollama (AI Assist)
echo -e "\n${BOLD}Optional AI Assist Check (Local LLM via Ollama):${RESET}"
if command -v ollama >/dev/null 2>&1; then
    echo -e "  ✅ Ollama: ${GREEN}Detected${RESET}"
else
    echo -e "  ℹ️  Ollama not installed. (Optional for local AI narration)"
fi

# 7. Post-setup Launch Menu
echo -e "\n${GREEN}${BOLD}========================================================"
echo "  🎉 Sentinel Setup Complete!"
echo "========================================================${RESET}\n"

echo -e "${BOLD}What would you like to launch right now?${RESET}"
echo -e "  ${CYAN}[1]${RESET} 🌐 Launch Web Mission Control GUI (http://localhost:3333)"
echo -e "  ${CYAN}[2]${RESET} 💻 Launch Interactive Terminal Dashboard (TUI)"
echo -e "  ${CYAN}[3]${RESET} 📖 Launch Documentation Website (http://localhost:5173)"
echo -e "  ${CYAN}[4]${RESET} 🚪 Exit and start using CLI manually\n"

read -p "Select option [1-4] (default: 1): " launch_choice
launch_choice="${launch_choice:-1}"

if [ "$launch_choice" = "1" ]; then
    echo -e "\n${GREEN}🚀 Starting Sentinel Web Mission Control on http://localhost:3333...${RESET}"
    node packages/platform/dist/cli.js ui
elif [ "$launch_choice" = "2" ]; then
    python3 packages/sentinel-py/sentinel.py dashboard
elif [ "$launch_choice" = "3" ]; then
    echo -e "\n${GREEN}📖 Starting VitePress documentation server...${RESET}"
    npm run docs
else
    echo -e "\n${GREEN}Setup complete! Run \`sentinel --help\` or \`sentinel dashboard\` anytime.${RESET}\n"
fi
