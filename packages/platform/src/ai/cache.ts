import type { AIAnalysis } from './provider.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export class AICache {
  private cache: Record<string, unknown> = {};
  private cachePath: string;
  private inMemory: boolean;

  constructor(projectDir: string, inMemory: boolean = false) {
    this.cachePath = path.join(projectDir, '.sentinel-ai-cache.json');
    this.inMemory = inMemory;
  }

  async load(): Promise<void> {
    if (this.inMemory) return;
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch {
      this.cache = {};
    }
  }

  async save(): Promise<void> {
    if (this.inMemory) return;
    try {
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  get(fingerprint: string): AIAnalysis | undefined {
    return this.cache[fingerprint] as AIAnalysis | undefined;
  }

  set(fingerprint: string, analysis: AIAnalysis): void {
    this.cache[fingerprint] = analysis;
  }

  /** Cache for non-assessment payloads (narratives, chapters, summaries). */
  getAny(fingerprint: string): unknown | undefined {
    return this.cache[fingerprint];
  }

  setAny(fingerprint: string, value: unknown): void {
    this.cache[fingerprint] = value;
  }

  generateFingerprint(ruleId: string, location: string, evidenceStr: string, model: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${ruleId}|${location}|${evidenceStr}|${model}`);
    return hash.digest('hex');
  }
}
