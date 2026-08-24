import fs from 'node:fs/promises';
import path from 'node:path';
import type { Severity } from '@sentinel/shared';
import type { UnifiedReport } from './orchestrator.js';

export interface SecurityPolicy {
  /** Maximum allowable severity before failing CI (e.g. 'critical', 'high') */
  failOn?: Severity;
  /** Maximum number of critical vulnerabilities permitted (default: 0) */
  maxCritical?: number;
  /** Maximum number of high vulnerabilities permitted (default: 0) */
  maxHigh?: number;
  /** Maximum number of medium vulnerabilities permitted */
  maxMedium?: number;
  /** Minimum acceptable overall security score (0 - 100) */
  minScore?: number;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: string[];
}

const SEVERITY_LEVELS: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export async function loadPolicy(customPath?: string): Promise<SecurityPolicy | null> {
  const policyFile = customPath ? path.resolve(customPath) : path.resolve(process.cwd(), 'sentinel.policy.json');
  try {
    const raw = await fs.readFile(policyFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.failOn) {
      parsed.failOn = String(parsed.failOn).toLowerCase() as Severity;
    }
    return parsed as SecurityPolicy;
  } catch {
    return null;
  }
}

export function evaluatePolicy(report: UnifiedReport, policy: SecurityPolicy): PolicyEvaluationResult {
  const violations: string[] = [];

  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of report.findings) {
    const sev = finding.severity.toLowerCase() as Severity;
    if (counts[sev] !== undefined) {
      counts[sev]++;
    }
  }

  // 1. Check failOn threshold
  if (policy.failOn) {
    const thresholdLevel = SEVERITY_LEVELS[policy.failOn.toLowerCase() as Severity] ?? 0;
    for (const [sev, count] of Object.entries(counts)) {
      const currentLevel = SEVERITY_LEVELS[sev as Severity] ?? 0;
      if (currentLevel >= thresholdLevel && count > 0) {
        violations.push(`Policy threshold '${policy.failOn}' exceeded: found ${count} ${sev.toUpperCase()} findings.`);
      }
    }
  }

  // 2. Check max thresholds
  if (policy.maxCritical !== undefined && counts.critical > policy.maxCritical) {
    violations.push(`Found ${counts.critical} CRITICAL findings (policy maximum: ${policy.maxCritical}).`);
  }

  if (policy.maxHigh !== undefined && counts.high > policy.maxHigh) {
    violations.push(`Found ${counts.high} HIGH findings (policy maximum: ${policy.maxHigh}).`);
  }

  if (policy.maxMedium !== undefined && counts.medium > policy.maxMedium) {
    violations.push(`Found ${counts.medium} MEDIUM findings (policy maximum: ${policy.maxMedium}).`);
  }

  // 3. Check min score
  if (policy.minScore !== undefined && report.overallScore < policy.minScore) {
    violations.push(`Overall security score ${report.overallScore}/100 is below required minimum of ${policy.minScore}/100.`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
