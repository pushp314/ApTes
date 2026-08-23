# Contributor Guide

Welcome to Sentinel! As a monorepo built on `npm workspaces`, contributing requires understanding our strict architectural boundaries.

## Local Development Pipeline

1. **Install Dependencies:** `npm install` at the root.
2. **Typecheck:** Run `npm run typecheck` to ensure there are no TypeScript errors across the boundaries.
3. **Lint:** Run `npm run lint` (uses ESLint).
4. **Test:** Run `npm run test` (uses Vitest).

## Boundary Rules (CRITICAL)

To maintain the embeddability of our engines, we enforce strict dependency rules:
- `@sentinel/codesentinel`, `@sentinel/web`, and `@sentinel/mcp` **MUST NOT** import from `@sentinel/platform`.
- All shared interfaces (e.g., the `Finding` model) must be defined in `@sentinel/shared`.

## How to Add a New CodeSentinel Rule

If you want to write a new AST rule (e.g., catching insecure cryptography):

1. Navigate to `packages/codesentinel/src/rules/detectors/`.
2. Create `insecure-crypto.ts` exporting an `analyze` function that accepts `SourceFile[]`.
3. Use `ts-morph` to query the AST (e.g., `sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)`).
4. Return an array of `Finding` objects.
5. **Fixtures:** You *must* add a vulnerable example to `packages/codesentinel/fixtures/sample-project/src/vulnerable/` and a safe example to `packages/codesentinel/fixtures/sample-project/src/safe/`.
6. **Tests:** Update `packages/codesentinel/src/scanner.test.ts` to assert that your rule fires exactly once on the vulnerable fixture and zero times on the safe fixture.
