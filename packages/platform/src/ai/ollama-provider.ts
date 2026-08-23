import type { Finding } from '@sentinel/shared';
import type { AIProvider, AIContext, AIAnalysis } from './provider.js';

export class OllamaProvider implements AIProvider {
  async analyzeFindings(findings: Finding[], context: AIContext): Promise<AIAnalysis[]> {
    if (findings.length === 0) return [];

    const url = context.url || 'http://localhost:11434';
    
    // We create a structured JSON prompt asking Ollama to output exactly the expected schema.
    const prompt = this.buildPrompt(findings);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), context.timeoutMs || 30000);

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: context.model,
          prompt,
          format: 'json',
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.warn(`Ollama responded with status: ${response.status}`);
        return [];
      }

      const data = await response.json() as { response: string };
      return this.parseResponse(data.response, findings);
    } catch (err) {
      // If Ollama is down, timeout occurs, or parse error, return empty array to fail gracefully
      // eslint-disable-next-line no-console
      console.warn('Ollama connection/processing failed:', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  private buildPrompt(findings: Finding[]): string {
    const payload = findings.map(f => ({
      findingId: f.id,
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      message: f.message,
      location: f.location,
      evidence: f.evidence
    }));

    return `You are a security and static analysis expert. Review the following software findings.
For each finding, provide a structured assessment of whether it is a true positive or a false positive.

Respond ONLY with a JSON object matching this schema exactly:
{
  "analyses": [
    {
      "findingId": "string",
      "assessment": {
        "verdict": "confirmed" | "likely" | "uncertain" | "dismissed",
        "confidence": number, // 0.0 to 1.0
        "reason": "string (explain why)",
        "impact": "string (optional)",
        "remediation": "string (optional)",
        "additionalEvidenceNeeded": ["string"] (optional)
      }
    }
  ]
}

Findings to analyze:
${JSON.stringify(payload, null, 2)}`;
  }

  private parseResponse(responseStr: string, originalFindings: Finding[]): AIAnalysis[] {
    try {
      const parsed = JSON.parse(responseStr);
      if (!parsed || !Array.isArray(parsed.analyses)) {
        return [];
      }

      const analyses: AIAnalysis[] = [];
      const validVerdicts = ['confirmed', 'likely', 'uncertain', 'dismissed'];

      for (const item of parsed.analyses) {
        if (!item.findingId || !item.assessment) continue;
        
        // Ensure the findingId actually matches one of the findings we sent
        if (!originalFindings.some(f => f.id === item.findingId)) continue;

        const v = item.assessment.verdict;
        const verdict = validVerdicts.includes(v) ? v : 'uncertain';

        analyses.push({
          findingId: item.findingId,
          assessment: {
            verdict: verdict as 'confirmed' | 'likely' | 'uncertain' | 'dismissed',
            confidence: typeof item.assessment.confidence === 'number' ? item.assessment.confidence : 0.5,
            reason: item.assessment.reason || 'No reasoning provided by AI.',
            impact: item.assessment.impact,
            remediation: item.assessment.remediation,
            additionalEvidenceNeeded: Array.isArray(item.assessment.additionalEvidenceNeeded) 
              ? item.assessment.additionalEvidenceNeeded 
              : undefined
          }
        });
      }

      return analyses;
    } catch {
      // JSON parse error from LLM
      return [];
    }
  }
}
