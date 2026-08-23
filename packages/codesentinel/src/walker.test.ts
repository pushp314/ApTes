import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { walkProject } from './walker.js';
import { createConfig } from './config.js';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const SAMPLE_PROJECT = path.join(FIXTURES_DIR, 'sample-project');

describe('walkProject', () => {
  it('discovers TypeScript and JavaScript files', async () => {
    const config = createConfig({ respectGitignore: false });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    // Should find the main source files
    expect(relativePaths).toContain(path.join('src', 'index.ts'));
    expect(relativePaths).toContain(path.join('src', 'utils.ts'));
    expect(relativePaths).toContain(path.join('src', 'components', 'Button.tsx'));
    expect(relativePaths).toContain(path.join('lib', 'helpers.js'));
  });

  it('respects .gitignore patterns', async () => {
    const config = createConfig({ respectGitignore: true });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    // Should find the main source files
    expect(relativePaths).toContain(path.join('src', 'index.ts'));
    expect(relativePaths).toContain(path.join('src', 'utils.ts'));

    // Should NOT find files in generated/ (ignored by .gitignore)
    expect(relativePaths).not.toContain(path.join('generated', 'output.ts'));

    // Should NOT find *.generated.ts files (ignored by .gitignore)
    expect(relativePaths).not.toContain(
      path.join('src', 'types.generated.ts'),
    );

    // skippedByGitignore should be > 0
    expect(result.skippedByGitignore).toBeGreaterThan(0);
  });

  it('includes gitignored files when respectGitignore is false', async () => {
    const config = createConfig({ respectGitignore: false });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    // Without gitignore, generated files should be found
    expect(relativePaths).toContain(path.join('generated', 'output.ts'));
    expect(relativePaths).toContain(
      path.join('src', 'types.generated.ts'),
    );
  });

  it('filters by file extensions', async () => {
    const config = createConfig({
      extensions: ['.ts'],
      respectGitignore: false,
    });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    // Should find .ts files
    expect(relativePaths).toContain(path.join('src', 'index.ts'));

    // Should NOT find .tsx or .js files
    expect(relativePaths).not.toContain(
      path.join('src', 'components', 'Button.tsx'),
    );
    expect(relativePaths).not.toContain(path.join('lib', 'helpers.js'));
  });

  it('enforces maxFiles limit', async () => {
    const config = createConfig({
      maxFiles: 2,
      respectGitignore: false,
    });
    const result = await walkProject(SAMPLE_PROJECT, config);

    expect(result.files.length).toBe(2);
    expect(result.truncatedByMaxFiles).toBe(true);
  });

  it('enforces maxFileSize limit', async () => {
    const config = createConfig({
      maxFileSize: 10, // 10 bytes — most files will exceed this
      respectGitignore: false,
    });
    const result = await walkProject(SAMPLE_PROJECT, config);

    // Most files are larger than 10 bytes
    expect(result.skippedBySize).toBeGreaterThan(0);
  });

  it('returns correct file metadata', async () => {
    const config = createConfig({ respectGitignore: true });
    const result = await walkProject(SAMPLE_PROJECT, config);

    for (const file of result.files) {
      expect(path.isAbsolute(file.absolutePath)).toBe(true);
      expect(file.sizeBytes).toBeGreaterThan(0);
      expect(file.relativePath).not.toContain(SAMPLE_PROJECT);
    }
  });

  it('produces deterministic sorted output', async () => {
    const config = createConfig({ respectGitignore: true });
    const result1 = await walkProject(SAMPLE_PROJECT, config);
    const result2 = await walkProject(SAMPLE_PROJECT, config);

    const paths1 = result1.files.map((f) => f.relativePath);
    const paths2 = result2.files.map((f) => f.relativePath);

    expect(paths1).toEqual(paths2);
  });

  it('excludes root-relative directories via excludePatterns', async () => {
    const config = createConfig({
      respectGitignore: false,
      excludePatterns: ['src/vulnerable/**'],
    });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    expect(
      relativePaths.some((p) => p.startsWith(path.join('src', 'vulnerable') + path.sep))
    ).toBe(false);
    expect(relativePaths).toContain(path.join('src', 'utils.ts'));
  });

  it('matches exclude globs at any directory depth', async () => {
    const config = createConfig({
      respectGitignore: false,
      excludePatterns: ['vulnerable/**'],
    });
    const result = await walkProject(SAMPLE_PROJECT, config);

    const relativePaths = result.files.map((f) => f.relativePath);

    expect(relativePaths.some((p) => p.split(path.sep).includes('vulnerable'))).toBe(false);
  });

  it('respects .sentinelignore patterns', async () => {
    const os = await import('node:os');
    const fsPromises = await import('node:fs/promises');

    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'sentinel-ignore-'));
    try {
      await fsPromises.mkdir(path.join(tmpDir, 'keep'), { recursive: true });
      await fsPromises.mkdir(path.join(tmpDir, 'secret-lab'), { recursive: true });
      await fsPromises.writeFile(path.join(tmpDir, '.sentinelignore'), 'secret-lab/\n');
      await fsPromises.writeFile(path.join(tmpDir, 'keep', 'a.ts'), 'export const a = 1;\n');
      await fsPromises.writeFile(
        path.join(tmpDir, 'secret-lab', 'b.ts'),
        'export const b = 2;\n'
      );

      const config = createConfig({ respectGitignore: false });
      const result = await walkProject(tmpDir, config);
      const relativePaths = result.files.map((f) => f.relativePath);

      expect(relativePaths).toContain(path.join('keep', 'a.ts'));
      expect(relativePaths.some((p) => p.includes('secret-lab'))).toBe(false);
    } finally {
      await fsPromises.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
