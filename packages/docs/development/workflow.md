# Development Workflow

Sentinel uses `npm workspaces` for package management.

## Setup
```bash
git clone https://github.com/sentinel/sentinel.git
cd sentinel
npm install
npm run build
```

## Architecture for Contributors
- Ensure your changes strictly respect the boundary enforcements. Do not import `@sentinel/platform` from within an engine.
- Shared models (`Finding`) live in `@sentinel/shared`. Do not duplicate definitions.
- Always add fixtures for new vulnerability signatures.

## Running Tests
Tests are executed via Vitest.
```bash
npm run test
```
