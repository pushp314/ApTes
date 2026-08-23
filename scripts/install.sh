#!/usr/bin/env bash
# ==============================================================================
# Sentinel Cross-Platform Installer for macOS and Linux
# Installs Sentinel CLI and sets up global commands
# ==============================================================================

set -e

RESET="\033[0m"
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
CYAN="\033[36m"
YELLOW="\033[33m"

echo -e "${BLUE}${BOLD}"
echo "  ========================================================"
echo "     🛡️  Installing Sentinel Security Platform"
echo "  ========================================================"
echo -e "${RESET}"

INSTALL_DIR="$HOME/.sentinel/bin"
mkdir -p "$INSTALL_DIR"

# Check for Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js detected:${RESET} $(node -v)"
else
    echo -e "${YELLOW}⚠️  Node.js not detected. You can still use the Python Security Toolkit.${RESET}"
fi

# Check for Python 3
if command -v python3 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Python 3 detected:${RESET} $(python3 --version)"
fi

# Create launcher wrapper in ~/.sentinel/bin
cat << 'EOF' > "$INSTALL_DIR/sentinel"
#!/usr/bin/env bash
# Sentinel CLI Launcher
REPO_ROOT="$(dirname "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")")"

if [ -f "$REPO_ROOT/packages/platform/dist/cli.js" ]; then
    node "$REPO_ROOT/packages/platform/dist/cli.js" "$@"
elif command -v npx >/dev/null 2>&1; then
    npx @sentinel/platform "$@"
else
    python3 "$REPO_ROOT/packages/sentinel-py/sentinel.py" "$@"
fi
EOF

chmod +x "$INSTALL_DIR/sentinel"

echo -e "\n${CYAN}Adding Sentinel to your shell PATH...${RESET}"

SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
    if ! grep -q 'export PATH="$HOME/.sentinel/bin:$PATH"' "$SHELL_RC"; then
        echo 'export PATH="$HOME/.sentinel/bin:$PATH"' >> "$SHELL_RC"
        echo -e "${GREEN}✓ Added to $SHELL_RC${RESET}"
    fi
fi

echo -e "\n${GREEN}${BOLD}========================================================"
echo "  ✅ Sentinel installed successfully!"
echo "========================================================${RESET}"
echo -e "\nTo get started right away, run:\n"
echo -e "  ${CYAN}sentinel dashboard${RESET}   # Interactive Terminal Hub"
echo -e "  ${CYAN}sentinel ui${RESET}          # Web Mission Control (http://localhost:3333)"
echo -e "\n(Run ${YELLOW}source $SHELL_RC${RESET} or open a new terminal if command is not recognized)\n"
