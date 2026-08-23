# Package Architecture

Each package in Sentinel follows a strict internal architecture to ensure consistency.

## Standard Engine Architecture

Inside an engine package (e.g., `packages/codesentinel/`), you will find:

- `src/index.ts`: The public exported API of the engine.
- `src/cli.ts`: A standalone CLI allowing the engine to be run independently of the platform.
- `src/runner.ts` / `scanner.ts`: The core execution loop that manages target parsing.
- `src/rules/`: A directory containing deterministic detection rules.
- `fixtures/`: Dedicated directories for `safe/`, `vulnerable/`, and `borderline/` testing targets.
- `tests/`: Unit and integration tests.

## Dependency Rules
1. **No Cross-Engine Imports:** `@sentinel/web` cannot import from `@sentinel/codesentinel`.
2. **Platform Isolation:** The Platform depends on engines, but engines must never import from the Platform. This ensures engines remain embeddable.
