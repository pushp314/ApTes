import type { UnifiedReport } from '../orchestrator.js';

export interface Reporter {
  /**
   * Generates a formatted report from a UnifiedReport.
   * @param report The synthesized report output from the orchestrator.
   * @returns A string representation of the report in the respective format.
   */
  generate(report: UnifiedReport): string;
}
