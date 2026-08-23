import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { walkProject } from './walker.js';
import { createConfig } from './config.js';
import { parseFiles } from './parser.js';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const SAMPLE_PROJECT = path.join(FIXTURES_DIR, 'sample-project');

describe('parseFiles', () => {
  it('parses TypeScript files into ASTs', async () => {
    const config = createConfig({ respectGitignore: true });
    const walkResult = await walkProject(SAMPLE_PROJECT, config);

    const tsFiles = walkResult.files.filter(
      (f) => f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'),
    );

    const result = parseFiles(tsFiles);

    expect(result.sourceFiles.length).toBe(tsFiles.length);
    expect(result.sourceFiles.length).toBeGreaterThan(0);
  });

  it('parses JavaScript files', async () => {
    const config = createConfig({ respectGitignore: true });
    const walkResult = await walkProject(SAMPLE_PROJECT, config);

    const jsFiles = walkResult.files.filter((f) =>
      f.relativePath.endsWith('.js'),
    );

    const result = parseFiles(jsFiles);

    expect(result.sourceFiles.length).toBe(jsFiles.length);
    expect(result.sourceFiles.length).toBeGreaterThan(0);
  });

  it('provides access to AST nodes', async () => {
    const config = createConfig({ respectGitignore: true });
    const walkResult = await walkProject(SAMPLE_PROJECT, config);

    const indexFile = walkResult.files.filter((f) =>
      f.relativePath === path.join('src', 'index.ts'),
    );

    const result = parseFiles(indexFile);
    const sourceFile = result.sourceFiles[0];

    expect(sourceFile).toBeDefined();

    // Should be able to find exported declarations
    const exports = sourceFile!.getExportedDeclarations();
    expect(exports.size).toBeGreaterThan(0);
  });

  it('provides access to function signatures', async () => {
    const config = createConfig({ respectGitignore: true });
    const walkResult = await walkProject(SAMPLE_PROJECT, config);

    const utilsFile = walkResult.files.filter((f) =>
      f.relativePath === path.join('src', 'utils.ts'),
    );

    const result = parseFiles(utilsFile);
    const sourceFile = result.sourceFiles[0];

    expect(sourceFile).toBeDefined();

    // utils.ts has an 'add' function with parameters
    const functions = sourceFile!.getFunctions();
    expect(functions.length).toBeGreaterThan(0);

    const addFn = functions.find((f) => f.getName() === 'add');
    expect(addFn).toBeDefined();
    expect(addFn!.getParameters()).toHaveLength(2);
  });

  it('handles all fixture files without crashing', async () => {
    const config = createConfig({ respectGitignore: true });
    const walkResult = await walkProject(SAMPLE_PROJECT, config);

    // Should not throw on any fixture file
    const result = parseFiles(walkResult.files);

    expect(result.sourceFiles.length + result.pythonFiles.length).toBe(walkResult.files.length);
  });

  it('returns an empty result for no files', () => {
    const result = parseFiles([]);

    expect(result.sourceFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.project).toBeDefined();
  });
});
