import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ContentHashCache, computeHash } from './cache.js';

describe('ContentHashCache', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codesentinel-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('treats all files as changed on first scan (no cache)', async () => {
    const cache = await ContentHashCache.load(tmpDir);

    const content = Buffer.from('export const x = 1;');
    const changed = cache.isChanged('src/index.ts', content);

    expect(changed).toBe(true);
  });

  it('detects unchanged files on second scan', async () => {
    const content = Buffer.from('export const x = 1;');

    // First scan
    const cache1 = await ContentHashCache.load(tmpDir);
    cache1.isChanged('src/index.ts', content);
    await cache1.save();

    // Second scan with same content
    const cache2 = await ContentHashCache.load(tmpDir);
    const changed = cache2.isChanged('src/index.ts', content);

    expect(changed).toBe(false);
  });

  it('detects changed files on second scan', async () => {
    const content1 = Buffer.from('export const x = 1;');
    const content2 = Buffer.from('export const x = 2;');

    // First scan
    const cache1 = await ContentHashCache.load(tmpDir);
    cache1.isChanged('src/index.ts', content1);
    await cache1.save();

    // Second scan with different content
    const cache2 = await ContentHashCache.load(tmpDir);
    const changed = cache2.isChanged('src/index.ts', content2);

    expect(changed).toBe(true);
  });

  it('drops stale entries on save', async () => {
    const content = Buffer.from('export const x = 1;');

    // First scan with two files
    const cache1 = await ContentHashCache.load(tmpDir);
    cache1.isChanged('src/a.ts', content);
    cache1.isChanged('src/b.ts', content);
    await cache1.save();

    // Second scan with only one file
    const cache2 = await ContentHashCache.load(tmpDir);
    cache2.isChanged('src/a.ts', content);
    await cache2.save();

    // Third scan — b.ts should be treated as new (stale entry dropped)
    const cache3 = await ContentHashCache.load(tmpDir);
    const changed = cache3.isChanged('src/b.ts', content);

    expect(changed).toBe(true);
  });

  it('handles corrupt cache file gracefully', async () => {
    const cachePath = path.join(tmpDir, '.codesentinel-cache.json');
    await fs.writeFile(cachePath, 'not valid json!!!', 'utf-8');

    const cache = await ContentHashCache.load(tmpDir);
    const content = Buffer.from('export const x = 1;');
    const changed = cache.isChanged('src/index.ts', content);

    // Should treat as new (corrupt cache = fresh start)
    expect(changed).toBe(true);
  });

  it('handles wrong version cache file', async () => {
    const cachePath = path.join(tmpDir, '.codesentinel-cache.json');
    await fs.writeFile(
      cachePath,
      JSON.stringify({ version: '999', entries: { 'src/index.ts': { hash: 'abc' } } }),
      'utf-8',
    );

    const cache = await ContentHashCache.load(tmpDir);
    const content = Buffer.from('export const x = 1;');
    const changed = cache.isChanged('src/index.ts', content);

    // Wrong version = invalidated cache
    expect(changed).toBe(true);
  });

  it('saves cache file to correct location', async () => {
    const cache = await ContentHashCache.load(tmpDir);
    cache.isChanged('test.ts', Buffer.from('x'));
    await cache.save();

    const cachePath = path.join(tmpDir, '.codesentinel-cache.json');
    const exists = await fs.stat(cachePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const raw = await fs.readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(raw) as { version: string; entries: Record<string, unknown> };
    expect(parsed.version).toBe('1');
    expect(parsed.entries['test.ts']).toBeDefined();
  });
});

describe('computeHash', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = computeHash(Buffer.from('hello'));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns same hash for same content', () => {
    const h1 = computeHash(Buffer.from('same content'));
    const h2 = computeHash(Buffer.from('same content'));
    expect(h1).toBe(h2);
  });

  it('returns different hash for different content', () => {
    const h1 = computeHash(Buffer.from('content A'));
    const h2 = computeHash(Buffer.from('content B'));
    expect(h1).not.toBe(h2);
  });
});
