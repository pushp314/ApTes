import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TypeErrorRule } from './type-errors.js';
import { ConfigDriftRule } from './config-drift.js';
import { PayloadMismatchRule } from './payload-mismatch.js';
import { PythonInjectionRule } from './python-injection.js';
import { UnhandledPromiseRule } from './unhandled-promises.js';
import { UnreachableCodeRule } from './unreachable-code.js';
import { ApiIntegrationRule } from './api-integration.js';
import { LogicContradictionsRule } from './logic-contradictions.js';
import { SecretsRule } from './secrets.js';
import { InjectionRule } from './injection.js';
import { AuthRule } from './auth.js';
import { ContractValidationRule } from './contract-validation.js';
import { OpenRedirectRule } from './open-redirect.js';
import { PrototypePollutionRule } from './prototype-pollution.js';
import { InsecureDeserializationRule } from './insecure-deserialization.js';
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
      targetDir: __dirname,
    };
  }

  function createContext(filePath: string): CodeRuleContext {
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
      targetDir: __dirname,
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
      
      const nosqlObjectFindings = findings.filter(f => (f.evidence as any)?.code?.includes('findOne('));
      expect(nosqlObjectFindings.length).toBe(1);
    });

    it('detects NoSQL injection across file boundaries (Phase 18)', () => {
      // The injection happens in cross-file-db.js, but the taint source is in cross-file-import.js
      // CodeSentinel evaluates files independently, but resolveExpression jumps across files!
      const context = createContext('packages/codesentinel/fixtures/sample-project/src/vulnerable/cross-file-db.js');
      const findings = InjectionRule.analyze(context);
      
      const crossFileFindings = findings.filter(f => (f.evidence as any)?.code?.includes('execute('));
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

  it('detects missing configuration variables (ConfigDriftRule)', () => {
    // We can simulate it by providing a real targetDir to the context
    const context = createTestContext('');
    context.targetDir = path.resolve(__dirname, '../../../fixtures/sample-project');
    const findings = ConfigDriftRule.analyze(context);

    expect(findings.length).toBeGreaterThan(0);
    const dbPassword = findings.find((f: any) => f.evidence?.variable === 'DB_PASSWORD');
    expect(dbPassword).toBeDefined();
    expect(dbPassword?.title).toBe('Configuration Drift');
    
    const apiKey = findings.find((f: any) => f.evidence?.variable === 'SECRET_API_KEY');
    expect(apiKey).toBeDefined();
  });

  it('detects frontend to backend payload mismatches (PayloadMismatchRule)', () => {
    const context = createTestContext(`
      const app = { post: (route, handler) => {} };
      app.post('/api/update', (req) => {
        const userEmail = req.body.email;
        const { age } = req.body;
      });
      fetch('/api/update', {
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe' })
      });
    `);
    
    const findings = PayloadMismatchRule.analyze(context);
    expect(findings.length).toBe(1);
    expect(findings[0].title).toBe('Request/Response Payload Mismatch');
    expect(findings[0].message).toContain('email');
    expect(findings[0].message).toContain('age');
  });

  it('detects python injection vulnerabilities (PythonInjectionRule)', async () => {
    // createTestContext only supports TS/JS using ts-morph. 
    // We need to construct a context with a python parser result.
    // We need to construct a context with a python parser result.
    const path = await import('node:path');
    const { PythonParser } = await import('../../parser/python.js');
    const parser = new PythonParser();
    const fixturePath = path.resolve(__dirname, '../../../fixtures/sample-project/src/vulnerable.py');
    const pyResult = parser.parseFile(fixturePath, path.dirname(fixturePath));
    
    const context = createTestContext('');
    context.parseResult = {
      project: context.project,
      sourceFiles: [],
      pythonFiles: [pyResult],
      errors: []
    };
    
    const findings = PythonInjectionRule.analyze(context);
    expect(findings.length).toBe(2);
    expect(findings[0].title).toBe('Unsafe Python Code Execution');
    expect(findings[0].evidence.function).toBe('eval');
    expect(findings[1].evidence.function).toBe('exec');
  });

  describe('OpenRedirectRule', () => {
    it('detects unvalidated redirect from req.query', () => {
      const context = createTestContext(`
        app.get('/login', (req, res) => {
          res.redirect(req.query.url);
        });
      `);
      const findings = OpenRedirectRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].ruleId).toBe('open-redirect');
      expect(findings[0].title).toBe('Unvalidated Open Redirect');
    });

    it('ignores safe relative redirect', () => {
      const context = createTestContext(`
        app.get('/login', (req, res) => {
          res.redirect('/dashboard');
        });
      `);
      const findings = OpenRedirectRule.analyze(context);
      expect(findings.length).toBe(0);
    });
  });

  describe('PrototypePollutionRule', () => {
    it('detects direct __proto__ assignment', () => {
      const context = createTestContext(`
        const obj = {};
        obj['__proto__'] = { admin: true };
      `);
      const findings = PrototypePollutionRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].ruleId).toBe('prototype-pollution');
      expect(findings[0].severity).toBe('critical');
    });

    it('detects unsafe recursive merge loop', () => {
      const context = createTestContext(`
        function merge(target, source) {
          for (let key in source) {
            merge(target[key], source[key]);
          }
        }
      `);
      const findings = PrototypePollutionRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].title).toContain('Prototype Pollution Risk');
    });
  });

  describe('InsecureDeserializationRule', () => {
    it('detects node-serialize unserialize call', () => {
      const context = createTestContext(`
        const serialize = require('node-serialize');
        const user = serialize.unserialize(req.cookies.profile);
      `);
      const findings = InsecureDeserializationRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].ruleId).toBe('insecure-deserialization');
      expect(findings[0].title).toBe('Insecure Object Deserialization');
    });

    it('detects unsafe yaml.load call', () => {
      const context = createTestContext(`
        const yaml = require('js-yaml');
        const config = yaml.load(rawInput);
      `);
      const findings = InsecureDeserializationRule.analyze(context);
      expect(findings.length).toBe(1);
      expect(findings[0].title).toBe('Unsafe YAML Loading');
    });
  });
});

