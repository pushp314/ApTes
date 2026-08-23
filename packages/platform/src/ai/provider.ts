import type { Finding, AiAssessment } from '@sentinel/shared';

export interface AIContext {
  model: string;
  timeoutMs?: number;
  url?: string;
}

export interface AIAnalysis {
  findingId: string;
  assessment: AiAssessment;
}

export interface AIProvider {
  /**
   * Analyzes a batch of findings and returns structured AI assessments.
   */
  analyzeFindings(findings: Finding[], context: AIContext): Promise<AIAnalysis[]>;
}
