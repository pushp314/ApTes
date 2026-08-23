# Repository Structure

Sentinel is organized as an `npm` workspace monorepo. This allows packages to share types while enforcing strict dependency boundaries.

## Directory Layout

```text
sentinel/
├── packages/
│   ├── codesentinel/      # AST parsing engine
│   ├── mcp/               # MCP introspection engine
│   ├── platform/          # Orchestrator & CLI
│   ├── shared/            # Common types (Finding interface)
│   ├── web/               # Playwright crawler engine
│   └── docs/              # This documentation portal
├── package.json           # Root workspace definition
└── tsconfig.json          # Global TypeScript configuration
```

## Boundary Enforcement
- Engines (`web`, `mcp`, `codesentinel`) **DO NOT** depend on `@sentinel/platform`.
- The `platform` depends on all engines.
- All packages depend on `@sentinel/shared`.
