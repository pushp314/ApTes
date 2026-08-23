import type { Finding } from '@sentinel/shared';
import type { AIProvider, AIContext, AIAnalysis } from './ai/provider.js';
import { OllamaProvider } from './ai/ollama-provider.js';
import { AICache } from './ai/cache.js';
import { ContextCollector } from './ai/collector.js';
import { SecretRedactor } from './ai/redactor.js';

export interface AiReviewerOptions {
  enabled: boolean;
  provider?: 'ollama' | 'mock';
  model?: string;
  url?: string;
  budget?: number; // max number of findings
  projectId: string;
  inMemoryCache?: boolean;
}

/**
 * AiReviewer acts as an optional assistant that reviews findings.
 * It enforces strict separation of deterministic rules and AI assessment,
 * and tracks a hard budget.
 */
export class AiReviewer {
  private options: AiReviewerOptions;
  private provider: AIProvider;
  private cache: AICache;
  private collector: ContextCollector;
  private redactor: SecretRedactor;

  constructor(options: Partial<AiReviewerOptions> & { projectId: string }, private projectDir: string = process.cwd()) {
    this.options = {
      enabled: options.enabled ?? false,
      provider: options.provider ?? 'ollama',
      model: options.model ?? 'llama3',
      url: options.url,
      budget: options.budget ?? 0, // 0 budget means no AI unless explicitly requested with >0
      projectId: options.projectId,
      inMemoryCache: options.inMemoryCache ?? false
    };

    this.cache = new AICache(this.projectDir, this.options.inMemoryCache);
    this.collector = new ContextCollector();
    this.redactor = new SecretRedactor();

    if (this.options.provider === 'mock') {
      this.provider = new MockProvider();
    } else {
      this.provider = new OllamaProvider();
    }
  }

  /**
   * Reviews an array of findings. If AI is disabled or budget is 0, returns them untouched.
   * Otherwise, processes only 'low' confidence findings, utilizing batching and cache.
   */
  async review(findings: Finding[]): Promise<Finding[]> {
    if (!this.options.enabled || this.options.budget === undefined || this.options.budget <= 0) {
      return findings;
    }

    await this.cache.load();

    const reviewedFindings: Finding[] = [];
    const pendingReview: Finding[] = [];

    // 1. Filter, Collector, Redactor & Cache Check
    for (const finding of findings) {
      if (finding.confidence !== 'low') {
        reviewedFindings.push(finding);
        continue;
      }

      // Collect context and redact secrets
      const context = await this.collector.collect(finding, this.projectDir);
      
      // Update finding with safe context evidence (redacted)
      const safeEvidence = this.redactor.redactObject({
        ...finding.evidence,
        sourceCodeSnippet: context.sourceCodeSnippet
      });
      
      const enrichedFinding: Finding = {
        ...finding,
        evidence: safeEvidence
      };

      // Cache Check
      const fingerprint = this.cache.generateFingerprint(
        enrichedFinding.ruleId,
        enrichedFinding.location || 'none',
        JSON.stringify(enrichedFinding.evidence),
        this.options.model || 'unknown'
      );

      const cachedResult = this.cache.get(fingerprint);
      if (cachedResult) {
        enrichedFinding.aiAssessment = cachedResult.assessment;
        reviewedFindings.push(enrichedFinding);
      } else {
        // Tag with fingerprint for caching later
        (enrichedFinding as unknown as Record<string, unknown>)._fingerprint = fingerprint;
        pendingReview.push(enrichedFinding);
      }
    }

    // 2. Budget Enforcement & Batching
    const allowedCount = this.options.budget!;
    const toProcess = pendingReview.slice(0, allowedCount);
    const toSkip = pendingReview.slice(allowedCount);

    if (toSkip.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[Sentinel AI] Budget exhausted (${this.options.budget}). Skipping remaining ${toSkip.length} findings.`);
      for (const r of toSkip) {
        // Remove internal tracking field
        delete (r as unknown as Record<string, unknown>)._fingerprint;
        reviewedFindings.push(r);
      }
    }

    const batchSize = 10;
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const aiContext: AIContext = {
        model: this.options.model || 'llama3',
        url: this.options.url,
        timeoutMs: 30000
      };

      const analyses = await this.provider.analyzeFindings(batch, aiContext);

      for (const finding of batch) {
        const analysis = analyses.find(a => a.findingId === finding.id);
        if (analysis) {
          finding.aiAssessment = analysis.assessment;
          const fp = (finding as unknown as Record<string, unknown>)._fingerprint as string | undefined;
          if (fp) this.cache.set(fp, analysis);
        }
        // Remove internal tracking field
        delete (finding as unknown as Record<string, unknown>)._fingerprint;
        reviewedFindings.push(finding);
      }
    }

    await this.cache.save();

    return reviewedFindings;
  }
}

// Mock provider for testing without Ollama
class MockProvider implements AIProvider {
  async analyzeFindings(findings: Finding[]): Promise<AIAnalysis[]> {
    return findings.map(f => ({
      findingId: f.id,
      assessment: {
        verdict: 'likely',
        confidence: 0.85,
        reason: 'Mock AI assessment determined this is likely an issue.',
        remediation: 'Review the mock output.'
      }
    }));
  }
}
