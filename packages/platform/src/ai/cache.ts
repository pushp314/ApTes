import type { AIAnalysis } from './provider.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export class AICache {
  private cache: Record<string, AIAnalysis> = {};
  private cachePath: string;

  constructor(projectDir: string) {
    this.cachePath = path.join(projectDir, '.sentinel-ai-cache.json');
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch {
      this.cache = {};
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  get(fingerprint: string): AIAnalysis | undefined {
    return this.cache[fingerprint];
  }

  set(fingerprint: string, analysis: AIAnalysis): void {
    this.cache[fingerprint] = analysis;
  }

  generateFingerprint(ruleId: string, location: string, evidenceStr: string, model: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${ruleId}|${location}|${evidenceStr}|${model}`);
    return hash.digest('hex');
  }
}
