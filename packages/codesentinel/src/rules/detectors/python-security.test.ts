import { describe, it, expect } from 'vitest';
import { PythonSecurityRule } from './python-security.js';
import { PythonParser } from '../../parser/python.js';
import { Project } from 'ts-morph';
import type { CodeRuleContext } from '../rule.js';
import * as fs from 'fs';
import * as path from 'path';

describe('PythonSecurityRule', () => {
  const pythonParser = new PythonParser();

  function createPythonContext(pyCode: string): CodeRuleContext {
    const tempFile = path.join(__dirname, 'temp_test.py');
    fs.writeFileSync(tempFile, pyCode, 'utf8');

    const parsedPy = pythonParser.parseFile(tempFile, __dirname);
    fs.unlinkSync(tempFile);

    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('dummy.ts', '');

    return {
      project,
      sourceFile,
      relativePath: 'test_app.py',
      projectId: 'python-test-proj',
      targetDir: __dirname,
      parseResult: {
        project,
        sourceFiles: [sourceFile],
        pythonFiles: [parsedPy],
        errors: [],
      },
    };
  }

  it('detects Python Mass Assignment via dictionary unpacking', () => {
    const code = `
@app.post("/users")
def create_user(request: Request):
    user = User(**request.json())
    db.session.add(user)
    return {"status": "ok"}
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const massAssign = findings.filter(f => f.ruleId === 'python-mass-assignment');
    expect(massAssign).toHaveLength(1);
    expect(massAssign[0]?.severity).toBe('high');
    expect(massAssign[0]?.message).toContain('Raw request dictionary is unpacked directly');
  });

  it('detects Python SQL Injection via f-strings and formatters', () => {
    const code = `
def get_user_data(user_id):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    cursor.execute(query)
    return cursor.fetchall()
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const sqli = findings.filter(f => f.ruleId === 'python-sqli');
    expect(sqli).toHaveLength(1);
    expect(sqli[0]?.severity).toBe('critical');
    expect(sqli[0]?.title).toContain('Python SQL Injection');
  });

  it('detects Python SSRF via user-controlled requests.get()', () => {
    const code = `
@app.get("/fetch")
def proxy_url(target_url: str):
    res = requests.get(target_url)
    return res.text
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const ssrf = findings.filter(f => f.ruleId === 'python-ssrf');
    expect(ssrf).toHaveLength(1);
    expect(ssrf[0]?.severity).toBe('high');
    expect(ssrf[0]?.title).toContain('Server-Side Request Forgery');
  });

  it('detects Python Insecure JWT with disabled signature verification', () => {
    const code = `
def parse_token(token):
    return jwt.decode(token, options={"verify_signature": False})
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const jwtFinding = findings.filter(f => f.ruleId === 'python-insecure-jwt');
    expect(jwtFinding).toHaveLength(1);
    expect(jwtFinding[0]?.severity).toBe('critical');
    expect(jwtFinding[0]?.message).toContain('JWT signature verification is disabled');
  });

  it('detects Python IDOR when querying records purely by path parameter ID', () => {
    const code = `
@app.get("/invoices/{doc_id}")
def get_invoice(doc_id: int):
    invoice = Invoice.objects.get(id=doc_id)
    return invoice
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const idor = findings.filter(f => f.ruleId === 'python-idor');
    expect(idor).toHaveLength(1);
    expect(idor[0]?.severity).toBe('high');
    expect(idor[0]?.title).toContain('Insecure Direct Object Reference');
  });

  it('detects Python Insecure Pickle Deserialization', () => {
    const code = `
import pickle
def load_session(data):
    return pickle.loads(data)
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const pickleFinding = findings.filter(f => f.ruleId === 'python-insecure-deserialization');
    expect(pickleFinding).toHaveLength(1);
    expect(pickleFinding[0]?.severity).toBe('critical');
    expect(pickleFinding[0]?.title).toContain('Insecure Python Object Deserialization');
  });

  it('detects Python Unsafe YAML loading', () => {
    const code = `
import yaml
def load_config(raw_yaml):
    return yaml.load(raw_yaml)
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const yamlFinding = findings.filter(f => f.ruleId === 'python-unsafe-yaml');
    expect(yamlFinding).toHaveLength(1);
    expect(yamlFinding[0]?.severity).toBe('high');
    expect(yamlFinding[0]?.title).toContain('Unsafe YAML Deserialization');
  });

  it('detects Python Open Redirect', () => {
    const code = `
@app.get("/login")
def login_redirect():
    target = request.args.get("next")
    return redirect(target)
`;
    const context = createPythonContext(code);
    const findings = PythonSecurityRule.analyze(context);

    const redirectFinding = findings.filter(f => f.ruleId === 'python-open-redirect');
    expect(redirectFinding).toHaveLength(1);
    expect(redirectFinding[0]?.severity).toBe('high');
    expect(redirectFinding[0]?.title).toContain('Python Open Redirect');
  });
});
