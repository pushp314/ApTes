# Contributing to Sentinel

Thank you for your interest in contributing to Sentinel! We welcome contributions to our deterministic security engines, reporters, and core platform.

## Development Setup

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **Python**: `3.10+` (used by AST parsers and reconnaissance tools)
- **Git**

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/pushp314/ApTes.git
   cd ApTes
   ```

2. Install dependencies (this will automatically configure Husky git hooks):

   ```bash
   npm install
   ```

3. Install Playwright browser dependencies (for web DOM analysis):
   ```bash
   npx playwright install --with-deps chromium
   ```

## Development Workflow

### Building

Build all packages across the monorepo:

```bash
npm run build
```

### Typechecking

Run static type checks across all workspaces:

```bash
npm run typecheck
```

### Testing & Coverage

Run the full Vitest suite (150+ unit & integration tests):

```bash
npm test
```

To run with V8 code coverage report:

```bash
npm run test:coverage
```

### Linting & Formatting

Lint the codebase using ESLint:

```bash
npm run lint
npm run lint:fix
```

Staged files are automatically formatted with Prettier and checked with ESLint on commit via `lint-staged`.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean git history and automate changelog generation. Commits are validated via Commitlint before commit creation:

- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation improvements
- `test:` Adding or updating tests
- `refactor:` Code changes that neither fix a bug nor add a feature
- `chore:` Changes to the build process, dependencies, or auxiliary tools

Example:

```bash
git commit -m "feat(recon): add nuclei adapter fixture support"
```

## Pull Request Process

1. Create a descriptive feature branch: `git checkout -b feat/your-feature-name`.
2. Ensure your changes pass `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test`.
3. Open a Pull Request targeting `main`. GitHub Actions CI will automatically run verification checks on your PR.
