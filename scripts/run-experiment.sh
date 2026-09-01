#!/usr/bin/env bash
set -e

echo "============================================================"
echo " Sentinel Empirical Evaluation: Baseline & Scaffolding Run"
echo "============================================================"

# Define directories and URLs
TARGET_DIR="juice-shop-target"
TARGET_URL="http://localhost:3000"
REPO_URL="https://github.com/juice-shop/juice-shop.git"
REPORT_DIR="eval-reports"

# 1. Setup workspace
mkdir -p "$REPORT_DIR"

if [ ! -d "$TARGET_DIR" ]; then
    echo "[*] Cloning OWASP Juice Shop..."
    git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
else
    echo "[*] Juice Shop already cloned in $TARGET_DIR."
fi

# 2. Spin up Juice Shop via Docker
echo "[*] Starting Juice Shop on $TARGET_URL..."
if ! docker ps | grep -q "bkimminich/juice-shop"; then
    docker run --rm -d -p 3000:3000 --name juice-shop bkimminich/juice-shop
    echo "[*] Waiting 15s for Juice Shop to fully boot..."
    sleep 15
else
    echo "[*] Juice Shop docker container is already running."
fi

# 3. Run Semgrep (SAST Baseline)
echo "[*] Running Semgrep (SAST Baseline)..."
if command -v semgrep &> /dev/null; then
    semgrep scan --config auto --json "$TARGET_DIR" > "$REPORT_DIR/semgrep-report.json" || true
    echo "[+] Semgrep scan complete."
else
    echo "[!] Semgrep not installed. Running via Docker..."
    docker run --rm -v "$(pwd)/$TARGET_DIR:/src" returntocorp/semgrep semgrep scan --config auto --json > "$REPORT_DIR/semgrep-report.json" || true
    echo "[+] Semgrep scan complete."
fi

# 4. Run ZAP (DAST Baseline)
echo "[*] Running OWASP ZAP (DAST Baseline) via Docker..."
# ZAP Baseline scan is extremely fast and suited for CI/eval
docker run --rm -t -v "$(pwd)/$REPORT_DIR:/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t "$TARGET_URL" -J zap-report.json || true
echo "[+] ZAP scan complete."

# 5. Run Sentinel (Our Tool)
echo "[*] Running Sentinel..."
# Assuming Sentinel is built. We run code, web, and recon engines against the target.
node packages/platform/dist/cli.js scan \
    --web "$TARGET_URL" \
    --code "$TARGET_DIR" \
    --format json > "$REPORT_DIR/sentinel-report.json" || true
echo "[+] Sentinel scan complete."

# Copy the sentinel report to the root where the eval runner expects it, or modify the runner
# to read from eval-reports. We'll copy it for now to match the scaffolding.
cp "$REPORT_DIR/sentinel-report.json" report.json

# 6. Generate Metrics
echo "============================================================"
echo " Generating Evaluation Metrics"
echo "============================================================"
npm run evaluate -w @sentinel/eval

echo ""
echo "[*] Experiment complete! Reports saved to $REPORT_DIR/"
echo "[*] To stop Juice Shop, run: docker stop juice-shop"
