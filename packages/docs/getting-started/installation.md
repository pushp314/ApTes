# Installation

Sentinel is built as a TypeScript monorepo using `npm workspaces`.

## Runtime Requirements
- **Node.js:** `>=20.0.0`
- **npm:** Included with Node.js.
- **Python 3:** (Optional, for serving local testing fixtures).
- **Ollama:** (Optional, for AI Assist capabilities).

## Installation Commands

Clone the repository and install dependencies from the root:

::: code-group
```bash [npm]
git clone https://github.com/sentinel/sentinel.git
cd sentinel
npm install
```

```bash [yarn]
git clone https://github.com/sentinel/sentinel.git
cd sentinel
yarn install
```

```bash [pnpm]
git clone https://github.com/sentinel/sentinel.git
cd sentinel
pnpm install
```
:::

## Build

Sentinel uses TypeScript across all packages. You must build the platform before running scans:

```bash
npm run build
```
*(This triggers a sequential build across `@sentinel/shared`, `@sentinel/web`, `@sentinel/mcp`, `@sentinel/platform`, and `@sentinel/codesentinel`)*.

## Testing

To run unit and integration tests across all workspaces:

```bash
npm run test
```
To run tests in watch mode during development:
```bash
npm run test:watch
```

## Typechecking & Linting

Sentinel enforces strict TypeScript checks and ESLint rules:

```bash
npm run typecheck
npm run lint
```
To automatically fix linting errors:
```bash
npm run lint:fix
```
