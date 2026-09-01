import { EvalMetrics } from '../metrics.js';

export function generateCsvReport(results: Record<string, EvalMetrics>): string {
  const headers = ['Configuration', 'True Positives', 'False Positives', 'False Negatives', 'Precision', 'Recall', 'F1 Score'];
  
  const rows = Object.entries(results).map(([configName, metrics]) => {
    return [
      configName,
      metrics.truePositives.toString(),
      metrics.falsePositives.toString(),
      metrics.falseNegatives.toString(),
      metrics.precision.toFixed(3),
      metrics.recall.toFixed(3),
      metrics.f1.toFixed(3)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateMarkdownReport(results: Record<string, EvalMetrics>): string {
  const headers = '| Configuration | True Positives | False Positives | False Negatives | Precision | Recall | F1 Score |';
  const divider = '|---|---|---|---|---|---|---|';
  
  const rows = Object.entries(results).map(([configName, metrics]) => {
    return `| ${configName} | ${metrics.truePositives} | ${metrics.falsePositives} | ${metrics.falseNegatives} | ${metrics.precision.toFixed(3)} | ${metrics.recall.toFixed(3)} | ${metrics.f1.toFixed(3)} |`;
  });

  return [headers, divider, ...rows].join('\n');
}
