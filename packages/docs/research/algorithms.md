# Sentinel Heuristic Algorithms

This page details the exact algorithmic approaches and heuristics used by CodeSentinel to identify vulnerabilities deterministically, particularly in untyped or legacy JavaScript codebases where strict TypeScript type definitions are unavailable.

## 1. Structural Data-Flow Taint Tracking

To detect injection vulnerabilities (SQLi, NoSQLi, Command Injection) without relying on simple string matching, CodeSentinel employs a custom **Data-Flow Taint Tracking** algorithm via `ts-morph` AST resolution.

### Taint Sources
A variable is marked as a **Taint Source** if its original identifier matches known unvalidated user input vectors. The `isTaintSource(node: Node)` heuristic scans for the following string literals within AST nodes:
- `req.body`, `req.query`, `req.params`, `req.headers`
- `request.body`, `request.query`, `request.params`, `request.headers`
- `event.body`, `event.queryStringParameters` (AWS Lambda inputs)

### Taint Propagation (`resolveExpression`)
When an insecure sink is identified (e.g., a database call), the argument is passed to `resolveExpression(node: Node)`. This algorithm traverses the AST backward:
1. If the node is a **Literal**, propagation stops (Safe).
2. If the node is an **Identifier**, the engine fetches its `VariableDeclaration` initializer and recursively resolves it up to a maximum depth of 3 to prevent infinite loops.
3. If the node is a **PropertyAccessExpression** (e.g., `req.body.username`), propagation does not strip the property. It retains the full path so `isTaintSource` can match the `req.body` origin.
4. If the node is an **ObjectLiteralExpression**, the traversal scans *inside* the object, resolving all descendant identifiers to track if any embedded value originates from a Taint Source.

---

## 2. Structural Routing & Authentication Detection

The `AuthRule` identifies Missing Authentication vulnerabilities. Legacy applications often use complex routing patterns (e.g., `router.post()`, nested middleware arrays) that bypass naive scanners.

### Identifying Sensitive Routes
CodeSentinel scans for `CallExpression` nodes where the property access is an HTTP method (`get`, `post`, `put`, `delete`, `patch`, `use`, `all`). 
The first argument (the route string) is evaluated. If it contains sensitive keywords (`admin`, `user`, `settings`, `dashboard`, `billing`), it triggers the authentication heuristic.

### Middleware Array Heuristics
Once a sensitive route is found, CodeSentinel evaluates the middleware structure structurally, rather than checking for a specific `express.RequestHandler` type:
1. **Argument Count (Missing Middleware):** If exactly 2 arguments are provided (e.g., `app.get('/admin', handler)`), it flags a missing auth middleware.
2. **Empty Array Mitigation (Bypass Detection):** Developers sometimes pass an array of middlewares. CodeSentinel actively evaluates if the second argument is an `ArrayLiteralExpression`. If `midArg.getElements().length === 0`, it flags the route as vulnerable, catching edge cases where middleware arrays are left intentionally empty.

---

## 3. Object-Based NoSQL Injection

The `InjectionRule` has been upgraded to support both string-based and object-based sinks.

### Sinks
CodeSentinel triggers on the following CallExpressions:
- **Raw SQL/Execution:** `db.query`, `db.execute`, `exec`, `execSync`, `spawn`.
- **ORMs/NoSQL (Mongoose, Sequelize):** Methods matching the regex `/\.(find|findOne|create|update|delete|destroy|findAll)$/` or containing `$where`.

### Payload Inspection
If a sink is identified, CodeSentinel does not just check for string concatenation (`"SELECT " + id`). It evaluates the entire argument:
- It uses `arg.getDescendantsOfKind(SyntaxKind.Identifier)` to recursively flatten the payload.
- It passes every identifier through the Taint Tracking algorithm.
- **Example:** `User.create(req.body)` will trigger an immediate P0 Injection Risk because the `req.body` Taint Source is passed directly into the `.create` sink without validation, a common NoSQL structural vulnerability.
