# Node.js Support

Sentinel provides first-class support for Node.js backends written in TypeScript or JavaScript.

## CodeSentinel (AST Parsing)

CodeSentinel uses `ts-morph` to parse Node.js codebases. It is explicitly optimized to recognize and analyze the following web frameworks:

- **Express.js**: Auto-detects `app.get()`, `app.post()`, and `req.body` to trace user input.
- **Fastify**: Traces request lifecycle and schema validations.
- **NestJS**: Analyzes decorators like `@Get()`, `@Body()`, and dependency injection graphs.

### Taint Tracking
When scanning Node.js, Sentinel tracks "taint" (untrusted data) from the HTTP request object all the way down to database sinks (e.g., `pg`, `mysql2`, `mongoose`, `prisma`). If the data is not sanitized along the path, it triggers a vulnerability finding.
