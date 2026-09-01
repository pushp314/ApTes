# Empirical Evaluation Harness

Sentinel is built not just as an engineering product, but as a research vehicle designed to prove that **Static-Dynamic-Recon Correlation** can mathematically reduce false positives in automated vulnerability scanning.

To facilitate this research, Sentinel ships with a dedicated `@sentinel/eval` workspace. This harness automates the execution of Sentinel against benchmark targets and calculates rigorous academic metrics.

## Methodology

The evaluation methodology revolves around a **Ground Truth** comparison. 

1. A vulnerable target application is defined (e.g., OWASP Juice Shop).
2. The known vulnerabilities of the target are mapped in `juice-shop-ground-truth.json`.
3. Sentinel is run against the target.
4. The emitted `report.json` is passed to the evaluation runner.
5. The runner calculates metrics for both **single-engine isolation** and **correlated execution**.

## Computed Metrics

The runner calculates the following metrics essential for publication:

- **True Positives (TP):** A finding that correctly matches the ground truth.
- **False Positives (FP):** A finding reported by the tool that does not exist in the ground truth (the core problem Sentinel aims to solve).
- **False Negatives (FN):** A vulnerability in the ground truth that the tool failed to find.

From these baseline numbers, the script computes:

- **Precision:** $TP / (TP + FP)$ (How much of what we reported was real?)
- **Recall:** $TP / (TP + FN)$ (How much of the total real vulnerabilities did we find?)
- **F1 Score:** $2 * \frac{Precision * Recall}{Precision + Recall}$ (The harmonic mean of precision and recall).

## Running the Evaluation

To run the harness yourself and reproduce the benchmark data:

```bash
# 1. Run the target
docker run --rm -p 3000:3000 bkimminich/juice-shop

# 2. Run Sentinel against it to produce the report
npm run start:cli -- scan \
    --web http://localhost:3000 \
    --code ./path/to/juice-shop-source \
    --format json > report.json

# 3. Compute metrics
npm run evaluate -w @sentinel/eval
```

## Automating Baselines

Sentinel also provides an automation script (`scripts/run-experiment.sh`) to automatically clone Juice Shop, run Semgrep (SAST Baseline), run OWASP ZAP (DAST Baseline), and run Sentinel to generate a comprehensive comparison data set.
