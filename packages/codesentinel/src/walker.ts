/**
 * File walker — discovers source files in a project directory.
 *
 * Responsibilities:
 * - Recursive directory traversal
 * - .gitignore pattern matching (root-level)
 * - Always-excluded directories (node_modules, .git, dist, etc.)
 * - File extension filtering
 * - Resource limit enforcement (max files, max file size)
 *
 * Per DEVELOPMENT_RULES.md §8: must respect .gitignore.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import type { CodeSentinelConfig } from './config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A file discovered by the walker. */
export interface WalkedFile {
  /** Absolute path to the file. */
  absolutePath: string;

  /** Path relative to the project root. */
  relativePath: string;

  /** File size in bytes. */
  sizeBytes: number;
}

/** Result of walking a project directory. */
export interface WalkResult {
  /** Files that passed all filters and are ready for analysis. */
  files: WalkedFile[];

  /** Number of files/directories skipped due to .gitignore patterns. */
  skippedByGitignore: number;

  /** Number of files skipped because they exceeded maxFileSize. */
  skippedBySize: number;

  /** True if the walk was stopped early because maxFiles was reached. */
  truncatedByMaxFiles: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Directories that are always excluded from scanning,
 * regardless of .gitignore settings.
 */
const ALWAYS_EXCLUDED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  '.vercel',
  '.output',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk a project directory and discover source files.
 *
 * @param rootDir - Absolute path to the project root directory.
 * @param config - CodeSentinel configuration with limits and filters.
 * @returns Walk result with discovered files and skip statistics.
 */
export async function walkProject(
  rootDir: string,
  config: CodeSentinelConfig,
): Promise<WalkResult> {
  const ig = await loadIgnore(rootDir, config);
  const extensionSet = new Set(config.extensions);

  const files: WalkedFile[] = [];
  let skippedByGitignore = 0;
  let skippedBySize = 0;
  let truncatedByMaxFiles = false;

  async function walk(dir: string): Promise<void> {
    if (truncatedByMaxFiles) return;

    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      // Directory not readable — skip silently
      return;
    }

    // Sort for deterministic output
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (truncatedByMaxFiles) return;

      const absolutePath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, absolutePath);

      if (entry.isDirectory()) {
        // Always-excluded directories
        if (ALWAYS_EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }

        // .gitignore check (directories need trailing slash)
        if (ig.ignores(relativePath + '/')) {
          skippedByGitignore++;
          continue;
        }

        await walk(absolutePath);
      } else if (entry.isFile()) {
        // Extension filter
        const ext = path.extname(entry.name);
        if (!extensionSet.has(ext)) {
          continue;
        }

        // .gitignore check
        if (ig.ignores(relativePath)) {
          skippedByGitignore++;
          continue;
        }

        // File size check
        let stat: import('node:fs').Stats;
        try {
          stat = await fs.stat(absolutePath);
        } catch {
          continue; // Can't stat — skip
        }

        if (stat.size > config.maxFileSize) {
          skippedBySize++;
          continue;
        }

        // Max files check
        if (files.length >= config.maxFiles) {
          truncatedByMaxFiles = true;
          return;
        }

        files.push({
          absolutePath,
          relativePath,
          sizeBytes: stat.size,
        });
      }
    }
  }

  await walk(rootDir);

  return { files, skippedByGitignore, skippedBySize, truncatedByMaxFiles };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Load ignore patterns and create an Ignore matcher.
 *
 * Sources, in order of intent:
 * - `.gitignore` (root-level) — only when respectGitignore is true
 * - `.sentinelignore` (root-level) — always respected; explicit scan-scope intent
 * - `config.excludePatterns` — CLI/config globs; always applied
 */
async function loadIgnore(
  rootDir: string,
  config: CodeSentinelConfig,
): Promise<Ignore> {
  const ig = ignore();

  if (config.respectGitignore) {
    const gitignorePath = path.join(rootDir, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(content);
    } catch {
      // No .gitignore — that's fine, continue without patterns
    }
  }

  const sentinelIgnorePath = path.join(rootDir, '.sentinelignore');
  try {
    const content = await fs.readFile(sentinelIgnorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .sentinelignore — fine
  }

  const patterns = config.excludePatterns.filter(p => p.trim().length > 0);
  if (patterns.length > 0) {
    ig.add(patterns);
    // Exclude globs are matched relative to the scan root by default
    // (gitignore anchoring). Users passing "fixtures/**" expect any
    // directory named fixtures to be skipped, so also add depth-free variants.
    const unanchored = patterns
      .filter(p => !p.startsWith('**/'))
      .map(p => `**/${p}`);
    if (unanchored.length > 0) {
      ig.add(unanchored);
    }
  }

  return ig;
}
