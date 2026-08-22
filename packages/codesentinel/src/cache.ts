/**
 * Content-hash cache for CodeSentinel.
 *
 * Implements the caching strategy from INSTRUCTION.md §14:
 *   File → Hash → Compare previous hash → unchanged: skip | changed: analyze
 *
 * Cache file: .codesentinel-cache.json (local, never uploaded)
 *
 * This makes repeated scans cheap and avoids re-analyzing unchanged files.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_FILENAME = '.codesentinel-cache.json';
const CACHE_VERSION = '1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry {
  /** SHA-256 hash of the file content. */
  hash: string;
}

interface CacheData {
  /** Cache format version — if this changes, the cache is invalidated. */
  version: string;

  /** Map of relative file paths to their cached hash. */
  entries: Record<string, CacheEntry>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Content-hash cache for skipping unchanged files.
 *
 * Usage:
 *   const cache = await ContentHashCache.load(projectRoot);
 *   for (const file of files) {
 *     const content = await readFile(file);
 *     if (cache.isChanged(file.relativePath, content)) {
 *       // analyze file
 *     }
 *   }
 *   await cache.save();
 */
export class ContentHashCache {
  private readonly previousData: CacheData;
  private readonly currentData: CacheData;
  private readonly cachePath: string;

  private constructor(cachePath: string, previousData: CacheData) {
    this.cachePath = cachePath;
    this.previousData = previousData;
    this.currentData = { version: CACHE_VERSION, entries: {} };
  }

  /**
   * Load an existing cache from the project root, or create an empty one.
   * If the cache file doesn't exist or is corrupt, starts fresh.
   */
  static async load(projectRoot: string): Promise<ContentHashCache> {
    const cachePath = path.join(projectRoot, CACHE_FILENAME);
    let data: CacheData = { version: CACHE_VERSION, entries: {} };

    try {
      const raw = await fs.readFile(cachePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);

      // Validate structure before trusting
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'version' in parsed &&
        'entries' in parsed &&
        (parsed as CacheData).version === CACHE_VERSION &&
        typeof (parsed as CacheData).entries === 'object'
      ) {
        data = parsed as CacheData;
      }
    } catch {
      // No cache file or invalid JSON — start fresh
    }

    return new ContentHashCache(cachePath, data);
  }

  /**
   * Check if a file has changed since the last cached scan.
   *
   * Also records the current hash in the new cache data,
   * so calling save() after processing all files will
   * write an up-to-date cache.
   *
   * @param relativePath - File path relative to the project root.
   * @param content - File content as a Buffer.
   * @returns true if the file is new or changed, false if unchanged.
   */
  isChanged(relativePath: string, content: Buffer): boolean {
    const hash = createHash('sha256').update(content).digest('hex');

    // Record in the new cache
    this.currentData.entries[relativePath] = { hash };

    // Check against previous cache
    const previous = this.previousData.entries[relativePath];
    if (!previous) return true; // New file — treat as changed
    return previous.hash !== hash;
  }

  /**
   * Save the current cache to disk.
   * This overwrites the previous cache with only the files
   * that were checked during this scan (stale entries are dropped).
   */
  async save(): Promise<void> {
    const json = JSON.stringify(this.currentData, null, 2);
    await fs.writeFile(this.cachePath, json, 'utf-8');
  }

  /** Returns the path to the cache file. */
  get filePath(): string {
    return this.cachePath;
  }
}

/**
 * Compute the SHA-256 hash of a buffer.
 * Exported for testing purposes.
 */
export function computeHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
