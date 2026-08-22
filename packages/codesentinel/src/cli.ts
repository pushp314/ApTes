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
  .action(async (targetPath: string, options: { cache: boolean; extensions: string }) => {
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

      if (result.findings.length > 0) {
        console.log(`\n🚨 Findings (${result.findings.length}):`);
        for (const finding of result.findings) {
          console.log(`\n  [${finding.severity.toUpperCase()}] ${finding.title}`);
          console.log(`  Rule:     ${finding.ruleId} (${finding.category})`);
          console.log(`  Location: ${finding.location}`);
          console.log(`  Message:  ${finding.message}`);
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
      if (result.findings.length > 0 || result.parseErrors.length > 0) {
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(2);
    }
  });

program.parse();
