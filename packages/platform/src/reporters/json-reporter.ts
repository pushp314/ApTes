import type { UnifiedReport } from '../orchestrator.js';
import type { Reporter } from './types.js';

export class JsonReporter implements Reporter {
  generate(report: UnifiedReport): string {
    return JSON.stringify(report, null, 2);
  }
}
