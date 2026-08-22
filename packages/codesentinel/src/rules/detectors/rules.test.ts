import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { TypeErrorRule } from './type-errors.js';
import { UnhandledPromiseRule } from './unhandled-promises.js';
import { UnreachableCodeRule } from './unreachable-code.js';
import type { CodeRuleContext } from '../rule.js';

describe('CodeSentinel Rules', () => {
  function createTestContext(code: string): CodeRuleContext {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { strictNullChecks: true, strict: true },
    });
    // Add a mock Promise declaration for the tests that need it
    project.createSourceFile('lib.d.ts', `
      declare class Promise<T> {
        static resolve<U>(value?: U): Promise<U>;
        then<U>(onfulfilled?: (value: T) => U): Promise<U>;
        catch<U>(onrejected?: (reason: any) => U): Promise<U>;
      }
    `);
    const sourceFile = project.createSourceFile('test.ts', code);
    return {
      project,
      sourceFile,
      projectId: 'test-project',
      relativePath: 'test.ts',
    };
  }

  describe('TypeErrorRule', () => {
    it('detects missing symbols', () => {
      const context = createTestContext(`
        export function foo() {
          return missingSymbol;
        }
      `);
      const findings = TypeErrorRule.analyze(context);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].category).toBe('missing-symbol');
      expect(findings[0].title).toContain('TS2304');
    });

    it('detects type mismatches', () => {
      const context = createTestContext(`
        const a: number = "string";
      `);
      const findings = TypeErrorRule.analyze(context);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].category).toBe('type-error');
      expect(findings[0].title).toContain('TS2322');
    });

    it('detects null/undefined risks', () => {
      const context = createTestContext(`
        function getLength(str: string | undefined) {
          return str.length;
        }
      `);
      const findings = TypeErrorRule.analyze(context);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].category).toBe('null-undefined-risk');
      expect(findings[0].title).toContain('possibly \'undefined\'');
    });

    it('detects broken imports', () => {
      const context = createTestContext(`
        import { doesNotExist } from 'fs';
      `);
      const findings = TypeErrorRule.analyze(context);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].category).toBe('broken-import');
    });
  });

  describe('UnhandledPromiseRule', () => {
    it('detects floating promises', () => {
      const context = createTestContext(`
        function doWork() {
          Promise.resolve(); // Unhandled
        }
      `);
      const findings = UnhandledPromiseRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('logic-error');
    });

    it('ignores awaited promises', () => {
      const context = createTestContext(`
        async function doWork() {
          await Promise.resolve(); // Handled
        }
      `);
      const findings = UnhandledPromiseRule.analyze(context);
      expect(findings.length).toBe(0);
    });

    it('ignores returned promises', () => {
      const context = createTestContext(`
        function doWork() {
          return Promise.resolve(); // Handled
        }
      `);
      const findings = UnhandledPromiseRule.analyze(context);
      expect(findings.length).toBe(0);
    });

    it('ignores caught promises', () => {
      const context = createTestContext(`
        function doWork() {
          Promise.resolve().catch(console.error); // Handled
        }
      `);
      const findings = UnhandledPromiseRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });

  describe('UnreachableCodeRule', () => {
    it('detects code after return', () => {
      const context = createTestContext(`
        function doWork() {
          return 1;
          const unreachable = true;
        }
      `);
      const findings = UnreachableCodeRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].message).toContain('never be executed');
    });

    it('detects code after throw', () => {
      const context = createTestContext(`
        function doWork() {
          throw new Error();
          console.log('hi');
        }
      `);
      const findings = UnreachableCodeRule.analyze(context);
      expect(findings.length).toBe(1);
    });

    it('detects code after break in loop', () => {
      const context = createTestContext(`
        for (let i = 0; i < 10; i++) {
          break;
          console.log(i);
        }
      `);
      const findings = UnreachableCodeRule.analyze(context);
      expect(findings.length).toBe(1);
    });

    it('ignores hoisted declarations after return', () => {
      const context = createTestContext(`
        function doWork() {
          return 1;
          function hoisted() {}
        }
      `);
      const findings = UnreachableCodeRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });
});
