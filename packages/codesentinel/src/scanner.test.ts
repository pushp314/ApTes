import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { scan } from './scanner.js';
import { createConfig } from './config.js';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const SAMPLE_PROJECT = path.join(FIXTURES_DIR, 'sample-project');

describe('scan (integration)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Use a temp dir copy of the fixture so cache files don't pollute fixtures
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codesentinel-scan-'));
    await copyDir(SAMPLE_PROJECT, tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('completes a full scan pipeline', async () => {
    const config = createConfig({
      useCache: false,
      respectGitignore: true,
    });
    const result = await scan(tmpDir, config);

    expect(result.filesDiscovered).toBeGreaterThan(0);
    expect(result.filesParsed).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('respects .gitignore during scan', async () => {
    const config = createConfig({
      useCache: false,
      respectGitignore: true,
    });
    const result = await scan(tmpDir, config);

    // generated/ dir and *.generated.ts should be excluded
    expect(result.skippedByGitignore).toBeGreaterThan(0);
  });

  it('caches results across scans', async () => {
    const config = createConfig({
      useCache: true,
      respectGitignore: true,
    });

    // First scan — all files are "changed" (no cache exists)
    const result1 = await scan(tmpDir, config);
    expect(result1.filesChanged).toBe(result1.filesDiscovered);
    expect(result1.filesUnchanged).toBe(0);

    // Second scan — all files unchanged
    const result2 = await scan(tmpDir, config);
    expect(result2.filesUnchanged).toBe(result2.filesDiscovered);
    expect(result2.filesChanged).toBe(0);
  });

  it('detects changes after file modification', async () => {
    const config = createConfig({
      useCache: true,
      respectGitignore: true,
    });

    // First scan
    await scan(tmpDir, config);

    // Modify a file
    const filePath = path.join(tmpDir, 'src', 'index.ts');
    await fs.appendFile(filePath, '\n// modified\n');

    // Second scan — should detect the change
    const result2 = await scan(tmpDir, config);
    expect(result2.filesChanged).toBeGreaterThanOrEqual(1);
  });

  it('works without cache', async () => {
    const config = createConfig({
      useCache: false,
      respectGitignore: true,
    });
    const result = await scan(tmpDir, config);

    // All files should be "changed" (cache disabled)
    expect(result.filesChanged).toBe(result.filesDiscovered);
    expect(result.filesUnchanged).toBe(0);

    // Cache file should not be created
    const cachePath = path.join(tmpDir, '.codesentinel-cache.json');
    const cacheExists = await fs.stat(cachePath).then(() => true).catch(() => false);
    expect(cacheExists).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function copyDir(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true });
  await fs.mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
