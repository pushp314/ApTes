import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { TypeErrorRule } from './type-errors.js';
import { UnhandledPromiseRule } from './unhandled-promises.js';
import { UnreachableCodeRule } from './unreachable-code.js';
import { ApiIntegrationRule } from './api-integration.js';
import { LogicContradictionsRule } from './logic-contradictions.js';
import { SecretsRule } from './secrets.js';
import { InjectionRule } from './injection.js';
import { AuthRule } from './auth.js';
import { ContractValidationRule } from './contract-validation.js';
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
      relativePath: 'test.ts',
      projectId: 'test-project',
      runId: 'run-1',
    };
  }

  function createContext(filePath: string): CodeRuleContext {
    const fs = require('fs');
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { allowJs: true, checkJs: true, esModuleInterop: true },
    });
    
    // Read and create in-memory files for cross-file tests
    const files = [
      'packages/codesentinel/fixtures/sample-project/src/vulnerable/cross-file-db.js',
      'packages/codesentinel/fixtures/sample-project/src/vulnerable/cross-file-import.js',
      'packages/codesentinel/fixtures/sample-project/src/vulnerable/nosql-injection.js'
    ];
    
    for (const file of files) {
      project.createSourceFile(file, fs.readFileSync(file, 'utf8'));
    }
    
    const sourceFile = project.getSourceFileOrThrow(filePath);
    return {
      project,
      sourceFile,
      relativePath: filePath,
      projectId: 'test-project',
      runId: 'run-1',
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

  describe('ApiIntegrationRule', () => {
    it('detects missing ok check', () => {
      const context = createTestContext(`
        async function fetchIt() {
          const res = await fetch('/api');
          return res.json();
        }
      `);
      const findings = ApiIntegrationRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('ignores handled ok check', () => {
      const context = createTestContext(`
        async function fetchIt() {
          const res = await fetch('/api');
          if (res.ok) return res.json();
        }
      `);
      const findings = ApiIntegrationRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });

  describe('LogicContradictionsRule', () => {
    it('detects always true', () => {
      const context = createTestContext(`if (true) {}`);
      const findings = LogicContradictionsRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('detects contradictory logic', () => {
      const context = createTestContext(`if (x === true && x === false) {}`);
      const findings = LogicContradictionsRule.analyze(context);
      expect(findings.length).toBe(1);
    });
  });

  describe('SecretsRule', () => {
    it('detects hardcoded openai keys', () => {
      const context = createTestContext(`const key = "sk-123456789012345678901234567890";`);
      const findings = SecretsRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('ignores generic strings', () => {
      const context = createTestContext(`const msg = "hello world";`);
      const findings = SecretsRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });

  describe('InjectionRule', () => {
    it('detects SQLi', () => {
      const context = createTestContext(`db.query(\`SELECT * FROM users WHERE id = \${id}\`);`);
      const findings = InjectionRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('ignores safe db queries', () => {
      const context = createTestContext(`db.query('SELECT * FROM users');`);
      const findings = InjectionRule.analyze(context);
      expect(findings.length).toBe(0);
    });
    it('detects NoSQL injection with taint tracking', () => {
      const context = createTestContext(`
        const username = req.body.username;
        User.findOne({ user: username });
      `);
      const findings = InjectionRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('detects NoSQL direct object injection', () => {
      const context = createContext('packages/codesentinel/fixtures/sample-project/src/vulnerable/nosql-injection.js');
      const findings = InjectionRule.analyze(context);
      
      const nosqlObjectFindings = findings.filter(f => f.evidence?.code.includes('findOne('));
      expect(nosqlObjectFindings.length).toBe(1);
    });

    it('detects NoSQL injection across file boundaries (Phase 18)', () => {
      // The injection happens in cross-file-db.js, but the taint source is in cross-file-import.js
      // CodeSentinel evaluates files independently, but resolveExpression jumps across files!
      const context = createContext('packages/codesentinel/fixtures/sample-project/src/vulnerable/cross-file-db.js');
      const findings = InjectionRule.analyze(context);
      
      const crossFileFindings = findings.filter(f => f.evidence?.code.includes('execute('));
      expect(crossFileFindings.length).toBe(1);
    });
  });

  describe('AuthRule', () => {
    it('detects missing auth on admin route', () => {
      const context = createTestContext(`app.post('/admin/settings', (req, res) => {});`);
      const findings = AuthRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('detects missing auth with empty array', () => {
      const context = createTestContext(`router.post('/admin/delete', [], (req, res) => {});`);
      const findings = AuthRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('ignores protected admin route', () => {
      const context = createTestContext(`app.post('/admin/settings', requireAuth, (req, res) => {});`);
      const findings = AuthRule.analyze(context);
      expect(findings.length).toBe(0);
    });
    it('ignores protected route with array middleware', () => {
      const context = createTestContext(`router.put('/admin/update', [requireAuth], (req, res) => {});`);
      const findings = AuthRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });

  describe('ContractValidationRule', () => {
    it('detects missing backend route', () => {
      const context = createTestContext(`
        // No backend routes defined
        fetch('/api/missing');
      `);
      const findings = ContractValidationRule.analyze(context);
      expect(findings.length).toBe(1);
    });
    it('ignores matching backend route', () => {
      const context = createTestContext(`
        app.get('/api/users', () => {});
        fetch('/api/users');
      `);
      const findings = ContractValidationRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });
});
