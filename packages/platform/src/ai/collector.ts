import type { Finding } from '@sentinel/shared';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface FindingContext {
  finding: Finding;
  sourceCodeSnippet?: string;
}

export class ContextCollector {
  private maxSnippetLines = 30;

  async collect(finding: Finding, projectDir: string): Promise<FindingContext> {
    const context: FindingContext = { finding };

    if (finding.engine === 'code' && finding.location) {
      // location is typically "path/to/file.ts:line"
      const parts = finding.location.split(':');
      if (parts.length >= 2) {
        const filePath = parts[0] as string;
        const lineNumber = parseInt(parts[1] as string, 10);

        if (!isNaN(lineNumber) && filePath) {
          try {
            const absolutePath = path.resolve(projectDir, filePath);
            const content = await fs.readFile(absolutePath, 'utf-8');
            const lines = content.split('\n');
            
            // Extract snippet surrounding the line
            const start = Math.max(0, lineNumber - 1 - Math.floor(this.maxSnippetLines / 2));
            const end = Math.min(lines.length, start + this.maxSnippetLines);
            
            context.sourceCodeSnippet = lines.slice(start, end).join('\n');
          } catch {
            // File not found or unreadable, ignore
          }
        }
      }
    }

    return context;
  }
}
