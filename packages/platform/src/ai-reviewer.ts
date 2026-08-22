import type { Finding } from '@sentinel/shared';

export interface AiReviewerOptions {
  enabled: boolean;
  provider?: 'ollama' | 'openai' | 'mock';
  model?: string;
}

/**
 * AiReviewer acts as an optional assistant that reviews findings.
 * It enforces the project rule that AI is strictly optional, off by default,
 * and only processes low-confidence findings.
 */
export class AiReviewer {
  private options: AiReviewerOptions;

  constructor(options: Partial<AiReviewerOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      provider: options.provider ?? 'mock',
      model: options.model ?? 'llama3'
    };
  }

  /**
   * Reviews an array of findings. If AI is disabled, returns them untouched.
   * Otherwise, processes only 'low' confidence findings.
   */
  async review(findings: Finding[]): Promise<Finding[]> {
    if (!this.options.enabled) {
      return findings;
    }

    const reviewedFindings: Finding[] = [];

    for (const finding of findings) {
      if (finding.confidence === 'low') {
        // Run AI review
        const reviewedFinding = await this.performReview(finding);
        reviewedFindings.push(reviewedFinding);
      } else {
        // High/medium confidence findings are never touched by AI
        reviewedFindings.push(finding);
      }
    }

    return reviewedFindings;
  }

  private async performReview(finding: Finding): Promise<Finding> {
    // In MVP, we mock the AI call to avoid hard environmental dependencies
    // like requiring Ollama to be running on the host machine.
    if (this.options.provider === 'mock') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        ...finding,
        message: `[AI Reviewed] ${finding.message} (The AI determined this is a likely false positive but warrants manual verification.)`,
        evidence: {
          ...finding.evidence,
          aiReviewed: true,
          aiModel: this.options.model,
          aiReasoning: 'Simulated heuristic check determined contextual safety.'
        }
      };
    }

    if (this.options.provider === 'ollama') {
      try {
        const prompt = `Review this security finding for potential false positives or provide additional context. Finding title: "${finding.title}". Message: "${finding.message}". Keep your answer brief.`;
        
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.options.model,
            prompt: prompt,
            stream: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            ...finding,
            message: `[AI Reviewed] ${finding.message}\n\nAI Insight: ${data.response}`,
            evidence: {
              ...finding.evidence,
              aiReviewed: true,
              aiModel: this.options.model
            }
          };
        } else {
          // If Ollama is running but errors out, just return the finding
          console.warn(`Ollama responded with status: ${response.status}`);
        }
      } catch (err) {
        // If Ollama isn't running or network error, fail gracefully and return the original finding
        console.warn('Ollama connection failed, returning unreviewed finding.', err);
      }
    }
    
    return finding;
  }
}
