#!/usr/bin/env node

/**
 * CodeSentinel CLI — local source-code analysis tool.
 *
 * Usage:
 *   codesentinel scan ./project
 *   codesentinel scan ./project --no-cache
 *   codesentinel scan ./project --extensions .ts,.tsx
 *
 * Per INSTRUCTION.md §12:
 *   CodeSentinel should work like: codesentinel scan ./project
 */

/* eslint-disable no-console */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Command } from 'commander';
import { createConfig } from './config.js';
import { scan } from './scanner.js';

const VERSION = '0.1.0';

const program = new Command();

program
  .name('codesentinel')
  .description('Local source-code analysis tool — detects bugs, API mismatches, logic errors, and cross-file inconsistencies')
  .version(VERSION);

program
  .command('scan')
  .description('Scan a project directory for code issues')
  .argument('<path>', 'Path to the project directory to scan')
  .option('--no-cache', 'Disable content-hash caching')
  .option(
    '--extensions <exts>',
    'File extensions to scan (comma-separated)',
    '.ts,.tsx,.js,.jsx',
  )
  .option('--export <path>', 'Export findings to JSON file')
  .option('--ai', 'Enable AI analysis for low confidence findings', false)
  .option('--budget <number>', 'Maximum number of findings for AI', '5')
  .action(async (targetPath: string, options: { cache: boolean; extensions: string; export?: string; ai?: boolean; budget?: string }) => {
    const resolvedPath = path.resolve(targetPath);

    const config = createConfig({
      useCache: options.cache,
      extensions: options.extensions.split(',').map((e) => e.trim()),
    });

    console.log(`CodeSentinel v${VERSION}`);
    console.log(`Scanning: ${resolvedPath}`);
    console.log();

    try {
      const result = await scan(resolvedPath, config);

      console.log(`Files discovered:  ${result.filesDiscovered}`);

      if (config.useCache) {
        console.log(`Files changed:     ${result.filesChanged}`);
        console.log(`Files unchanged:   ${result.filesUnchanged}`);
      }

      console.log(`Files parsed:      ${result.filesParsed}`);

      let finalFindings = result.findings;

      if (options.ai) {
        console.log(`\n[Sentinel AI] Running AI analysis on low-confidence findings (Budget: ${options.budget})...`);
        try {
          // @ts-ignore: Platform may not be linked; we load it dynamically
          const { AiReviewer } = await import('@sentinel/platform');
          const reviewer = new AiReviewer({
            enabled: true,
            budget: options.budget ? parseInt(options.budget, 10) : 5,
            projectId: 'codesentinel-local'
          }, resolvedPath);
          finalFindings = await reviewer.review(finalFindings);
        } catch (err) {
          console.error("\n[!] Failed to load AI modules. Ensure @sentinel/platform is built and linked.", err);
          process.exit(1);
        }
      }

      if (options.export) {
        await fs.writeFile(path.resolve(options.export), JSON.stringify(finalFindings, null, 2), 'utf-8');
        console.log(`\nFindings exported to ${options.export}`);
      }

      if (finalFindings.length > 0) {
        console.log(`\n🚨 Findings (${finalFindings.length}):`);
        for (const finding of finalFindings) {
          console.log(`\n  [${finding.severity.toUpperCase()}] ${finding.title}`);
          console.log(`  Rule:     ${finding.ruleId} (${finding.category})`);
          console.log(`  Location: ${finding.location}`);
          console.log(`  Message:  ${finding.message}`);
          if (finding.aiAssessment) {
            console.log(`  AI Verdict: [${finding.aiAssessment.verdict.toUpperCase()}] ${finding.aiAssessment.reason}`);
          }
          console.log(`  Fix:      ${finding.remediation}`);
        }
        console.log('');
      } else {
        console.log(`\n✅ No findings detected.\n`);
      }

      if (result.parseErrors.length > 0) {
        console.log(`Parse errors:      ${result.parseErrors.length}`);
        for (const err of result.parseErrors) {
          const loc = err.line ? `:${err.line}:${err.column ?? 1}` : '';
          console.log(`  ${err.file}${loc}: ${err.message}`);
        }
      }

      if (result.skippedByGitignore > 0) {
        console.log(`Skipped (gitignore): ${result.skippedByGitignore}`);
      }
      if (result.skippedBySize > 0) {
        console.log(`Skipped (too large): ${result.skippedBySize}`);
      }
      if (result.truncatedByMaxFiles) {
        console.log(`⚠ Scan truncated: reached maximum file limit`);
      }

      console.log(`Scan complete in ${result.durationMs}ms`);

      // Exit with error code if there were findings or parse errors
      if (finalFindings.length > 0 || result.parseErrors.length > 0) {
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(2);
    }
  });

program.parse();
