/**
 * Regression tests for Next.js App Router API route detection in AuthRule.
 */
import { describe, it, expect } from 'vitest';
import { Project, SyntaxKind } from 'ts-morph';
import * as crypto from 'node:crypto';
import { AuthRule } from './auth.js';
import type { CodeRuleContext } from '../rule.js';

function makeContext(relPath: string, sourceText: string): CodeRuleContext {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('/' + relPath, sourceText);
  // Register the file under its relative path so getFilePath matches
  return {
    project,
    sourceFile,
    projectId: 'test-project',
    relativePath: relPath,
    targetDir: '/',
    skipTypeErrors: false,
  };
}

describe('AuthRule — Next.js App Router routes', () => {
  it('flags sensitive app/api route handlers without auth logic', () => {
    const context = makeContext(
      'app/api/admin/users/route.ts',
      `export async function GET(request: Request) {
  const users = await db.query("SELECT * FROM users");
  return Response.json(users);
}
`
    );
    void crypto.randomUUID;

    const findings = AuthRule.analyze(context);

    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('missing-auth');
    expect(findings[0].evidence?.route).toBe('/api/admin/users');
  });

  it('does not flag handlers that reference authentication', () => {
    const context = makeContext(
      'app/api/admin/settings/route.ts',
      `import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ ok: true });
}
`
    );

    expect(AuthRule.analyze(context)).toHaveLength(0);
  });

  it('ignores non-sensitive api routes and non-route files', () => {
    const cleanRoute = makeContext(
      'app/api/public/health/route.ts',
      `export async function GET() {
  return Response.json({ status: "ok" });
}
`
    );
    const plainFile = makeContext(
      'src/server.ts',
      `export async function GET() {
  return Response.json({ status: "ok" });
}
`
    );

    expect(AuthRule.analyze(cleanRoute)).toHaveLength(0);
    expect(AuthRule.analyze(plainFile)).toHaveLength(0);
  });
});

// Keep ts-morph import used across environments
void SyntaxKind;
