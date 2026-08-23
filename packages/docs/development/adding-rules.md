# Adding Rules

Each engine defines rules differently, but they all return a `Finding` object.

## 1. WebSentinel Rules
Located in `packages/web/src/rules/`.
Web rules are classes that implement the `WebRule` interface. They have access to the Playwright `Page` and `Response` objects.

```typescript
export interface WebRule {
  id: string;
  category: 'security' | 'logic-error' | 'other';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  evaluate(page: Page, response: Response | null): Promise<Finding[]>;
}
```

## 2. CodeSentinel Rules
Located in `packages/codesentinel/src/rules/`.
Code rules use `ts-morph` AST Node traversal. They export an `analyze` function that accepts an array of `SourceFile`s.

## 3. MCPSentinel Rules
Located in `packages/mcp/src/rules/`.
MCP rules evaluate the JSON manifest returned by `listTools()`, `listResources()`, or `listPrompts()`.
