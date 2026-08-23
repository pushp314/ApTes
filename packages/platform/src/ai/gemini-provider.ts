import { GoogleGenAI } from '@google/genai';
import type { Finding } from '@sentinel/shared';
import type { AIProvider, AIContext, AIAnalysis } from './provider.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async analyzeFindings(findings: Finding[], _context: AIContext): Promise<AIAnalysis[]> {
    if (findings.length === 0) return [];
    
    // Fallback stub for now, would translate to Gemini similarly to Ollama
    return [];
  }

  /**
   * Specifically asks Gemini to figure out the start command of a project.
   */
  async analyzeWorkspaceForCommand(dir: string): Promise<string | undefined> {
    try {
      // Collect top level files
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const topLevelFiles = entries
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
        .map(e => e.name);

      let contextStr = `Top level files in workspace:\n${topLevelFiles.join('\n')}\n\n`;

      // Try to get package.json snippet if exists
      if (topLevelFiles.includes('package.json')) {
        const pkg = await fs.readFile(path.join(dir, 'package.json'), 'utf8');
        const parsed = JSON.parse(pkg);
        contextStr += `package.json scripts:\n${JSON.stringify(parsed.scripts || {}, null, 2)}\n`;
      }

      // Try to get Dockerfile if exists
      if (topLevelFiles.includes('Dockerfile')) {
        const dfile = await fs.readFile(path.join(dir, 'Dockerfile'), 'utf8');
        contextStr += `Dockerfile:\n${dfile.slice(0, 500)}\n`; // just top 500 chars
      }

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: `You are an expert developer. Based on the following workspace context, what is the single bash command to start the backend API server? Only return the exact command (e.g. "npm start", "python main.py"). Do not use markdown backticks.\n\nContext:\n${contextStr}`,
      });

      if (response.text) {
        return response.text.trim().replace(/`/g, '');
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async generateStructured(): Promise<null> {
    // Gemini path is not used for narrative generation; the local-first
    // Ollama provider owns structured generation.
    return null;
  }
}
