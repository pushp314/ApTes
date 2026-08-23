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

  /**
   * Sends a system + user prompt and returns the parsed JSON response,
   * constrained to the provided JSON schema when the backend supports
   * structured outputs. Returns null on any failure — callers must have
   * deterministic fallbacks.
   */
  generateStructured(
    system: string,
    user: string,
    schema: Record<string, unknown>,
    context: AIContext
  ): Promise<unknown | null>;
}
