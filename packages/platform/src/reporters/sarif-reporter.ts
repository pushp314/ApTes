import type { Reporter } from './types.js';
import type { UnifiedReport } from '../orchestrator.js';

/**
 * SARIF v2.1.0 Reporter
 *
 * Produces Static Analysis Results Interchange Format (SARIF) output
 * compatible with GitHub Advanced Security, Azure DevOps, and other
 * SARIF-consuming tools.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri: string };
      region?: { startLine: number; startColumn?: number };
    };
  }>;
  properties?: Record<string, unknown>;
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: Array<{
        id: string;
        shortDescription: { text: string };
        defaultConfiguration: { level: string };
        properties?: Record<string, unknown>;
      }>;
    };
  };
  results: SarifResult[];
}

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

function severityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
    case 'INFO':
    default:
      return 'note';
  }
}

function parseLocation(location?: string): { uri: string; line?: number } | undefined {
  if (!location) return undefined;

  // Handle "file:line" format (e.g., "src/api/client.ts:42")
  const fileLineMatch = location.match(/^(.+):(\d+)$/);
  if (fileLineMatch && fileLineMatch[1] && fileLineMatch[2]) {
    return { uri: fileLineMatch[1], line: parseInt(fileLineMatch[2], 10) };
  }

  // Handle URL format
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return { uri: location };
  }

  // Handle plain file path
  return { uri: location };
}

export class SarifReporter implements Reporter {
  generate(report: UnifiedReport): string {
    const ruleMap = new Map<string, { id: string; description: string; level: string }>();
    const results: SarifResult[] = [];

    for (const finding of report.findings) {
      // Collect unique rules
      if (!ruleMap.has(finding.ruleId)) {
        ruleMap.set(finding.ruleId, {
          id: finding.ruleId,
          description: finding.title,
          level: severityToSarifLevel(finding.severity),
        });
      }

      const result: SarifResult = {
        ruleId: finding.ruleId,
        level: severityToSarifLevel(finding.severity),
        message: { text: finding.message },
        properties: {
          engine: finding.engine,
          confidence: finding.confidence,
          category: finding.category,
          remediation: finding.remediation,
        },
      };

      // Parse location into SARIF physicalLocation
      const loc = parseLocation(finding.location);
      if (loc) {
        result.locations = [
          {
            physicalLocation: {
              artifactLocation: { uri: loc.uri },
              ...(loc.line ? { region: { startLine: loc.line } } : {}),
            },
          },
        ];
      }

      results.push(result);
    }

    const sarifLog: SarifLog = {
      $schema:
        'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Sentinel',
              version: '0.1.0',
              informationUri: 'https://github.com/pushp314/ApTes',
              rules: Array.from(ruleMap.values()).map((r) => ({
                id: r.id,
                shortDescription: { text: r.description },
                defaultConfiguration: { level: r.level },
              })),
            },
          },
          results,
        },
      ],
    };

    return JSON.stringify(sarifLog, null, 2);
  }
}
