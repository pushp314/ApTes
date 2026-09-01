export interface GroundTruthFinding {
  id: string;
  description: string;
  expectedCategory: string;
  expectedSeverity: string;
}

export interface GroundTruth {
  target: string;
  findings: GroundTruthFinding[];
}

export interface EvalMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export function calculateMetrics(
  reportedFindings: any[],
  groundTruth: GroundTruth,
  matchFn: (reported: any, truth: GroundTruthFinding) => boolean
): EvalMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const matchedTruthIds = new Set<string>();

  for (const reported of reportedFindings) {
    let matched = false;
    for (const truth of groundTruth.findings) {
      if (matchFn(reported, truth)) {
        matched = true;
        matchedTruthIds.add(truth.id);
        break;
      }
    }
    if (matched) {
      truePositives++;
    } else {
      falsePositives++;
    }
  }

  falseNegatives = groundTruth.findings.length - matchedTruthIds.size;

  const precision = truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  const recall = truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
  const f1 = precision + recall === 0 ? 0 : 2 * ((precision * recall) / (precision + recall));

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1
  };
}
