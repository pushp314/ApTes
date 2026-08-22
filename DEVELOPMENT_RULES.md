# SENTINEL — DEVELOPMENT RULES

Version: 1.0
Status: Active
Purpose: Rules for building and maintaining the Sentinel project.

---

# 1. MASTER RULE

Before doing any development work:

1. Read `INSTRUCTION.md`.
2. Read this `DEVELOPMENT_RULES.md`.
3. Identify the current development phase.
4. Work ONLY on the requested phase/task.
5. Do not implement future-phase features unless explicitly requested.
6. Inspect the existing code before modifying it.
7. Preserve existing architecture and security boundaries.
8. Test every meaningful change before declaring it complete.

The agent must never treat this project as a "build everything at once" task.

---

# 2. PROJECT ARCHITECTURE

Sentinel consists of three independent engines:

1. CodeSentinel
   - Local source-code analysis.
   - No live-domain testing.
   - No network dependency.
   - Deterministic AST/rule analysis.

2. Web Engine
   - Tests deployed web applications.
   - Browser/API testing.
   - Requires appropriate target authorization.
   - Must enforce SSRF and target-safety protections.

3. MCP Engine
   - Security analysis of MCP servers.
   - Introspection only.
   - Must never invoke target MCP tools during static scanning.

These engines must remain independently runnable.

DO NOT merge their internal execution models.

They may share:

- Finding format
- Rule interfaces
- Configuration conventions
- Reporting
- Logging
- Common utilities
- Optional correlation

---

# 3. DEVELOPMENT ORDER

The project must be developed in this order:

Phase 0 → Foundation

Phase 1 → Shared Contracts

Phase 2 → CodeSentinel Foundation

Phase 3 → CodeSentinel Bug Detection

Phase 4 → CodeSentinel API Analysis

Phase 5 → CodeSentinel Logic & Cross-File Analysis

Phase 6 → CodeSentinel Security Analysis

Phase 7 → CodeSentinel Fixture / Bug Laboratory Validation

Phase 8 → CodeSentinel Python Analysis

Phase 9 → Web Engine Foundation

Phase 10 → Web Functional/API Testing

Phase 11 → Web Security & Reliability

Phase 12 → MCP Engine Foundation

Phase 13 → MCP Security Rules

Phase 14 → Unified Findings & Correlation

Phase 15 → Reporting & UX

Phase 16 → Optional AI Assist

Phase 17 → Final Hardening & Release

Do not skip phases unless explicitly instructed.

---

# 4. PHASE DISCIPLINE

Each phase follows this lifecycle:

PLAN
↓
INSPECT
↓
IMPLEMENT
↓
TEST
↓
REVIEW
↓
COMMIT
↓
PHASE GATE
↓
NEXT PHASE

Never move to the next phase until the current phase passes its validation requirements.

---

# 5. BEFORE WRITING CODE

The agent MUST first:

1. Inspect the repository.
2. Understand the current architecture.
3. Identify existing related modules.
4. Check whether the requested functionality already exists.
5. Identify the smallest set of files that need modification.
6. Check `INSTRUCTION.md` for architectural restrictions.
7. Check this file for development restrictions.

Do not rewrite existing systems unnecessarily.

Do not create duplicate implementations.

---

# 6. MINIMAL CHANGE PRINCIPLE

Prefer the smallest correct implementation.

DO NOT:

- Rewrite working modules unnecessarily.
- Introduce unnecessary frameworks.
- Create microservices for simple functionality.
- Add databases without a clear requirement.
- Add dependencies when existing dependencies can solve the problem.
- Build future features early.
- Refactor unrelated code during a feature task.

Every change should have a clear reason.

---

# 7. CODE QUALITY RULES

All production code must:

- Be strongly typed where applicable.
- Have clear module boundaries.
- Follow existing project conventions.
- Avoid duplicated logic.
- Handle expected errors.
- Avoid silent failures.
- Use meaningful names.
- Keep functions reasonably small.
- Keep security-sensitive operations isolated.

Do not sacrifice correctness for speed of implementation.

---

# 8. CODE SENTINEL RULES

CodeSentinel is a local source-code analyzer.

It MUST:

- Analyze local source code.
- Use AST/type-analysis tools.
- Respect `.gitignore`.
- Use content-hash caching.
- Avoid live website testing.
- Avoid browser automation.
- Avoid unnecessary network calls.
- Work without AI.
- Produce useful findings with zero AI calls.

Primary technologies:

- TypeScript
- ts-morph / TypeScript Compiler API
- @typescript-eslint/parser
- tree-sitter when additional languages are required

Do not create a custom programming-language parser.

---

# 9. CODESENTINEL ANALYSIS PRIORITY

Implement deterministic analysis first.

Required categories:

### Bugs

- Type errors
- Null/undefined risks
- Unhandled promises
- Broken imports
- Unreachable code
- Missing symbols

### API Integration

- Broken API integrations
- Frontend/backend mismatches
- Request/response mismatches
- Wrong HTTP methods
- Wrong routes
- Missing required fields
- Unexpected fields
- Missing error handling

### Logic

- Always-true conditions
- Always-false conditions
- Contradictory conditions
- Dead code
- Empty catch blocks
- Duplicate logic
- Contradictory logic

### Cross-file

- Configuration drift
- Validation drift
- Duplicate constants
- Missing routes/functions
- Contract mismatches

### Security Analysis

- Secrets (hardcoded API keys, passwords, tokens, private keys)
- Injection (SQL injection, command injection, path traversal, dangerous eval)
- Web/API Security (missing auth, IDOR, CORS, unsafe file handling, SSRF)
- Authentication / Authorization (sensitive routes without auth, dangerous JWT)
- Cryptography (weak hashing, hardcoded keys, insecure random)
- Security Configuration (debug mode in prod, insecure defaults)

Rules must be conservative.

If the analyzer cannot prove a problem with sufficient confidence, it should prefer a lower-confidence finding rather than falsely reporting a critical issue.

---

# 10. AI RULE

AI is OPTIONAL.

AI MUST NOT be required for the core product.

Default:

AI = OFF

The deterministic scanner must remain fully functional without:

- OpenAI API
- Anthropic API
- Any external AI API
- Ollama

AI may only assist with low-confidence findings.

AI must never:

- Replace deterministic rules.
- Override high-confidence critical findings.
- Create new critical findings.
- Automatically modify source code.
- Automatically execute commands.
- Become required for scanning.

---

# 11. TOKEN-COST RULE

The project exists partly to reduce unnecessary AI usage.

Therefore:

DEFAULT:

    0 AI calls
    0 paid API tokens

When AI is enabled:

1. Prefer local Ollama.
2. Never silently fall back to a paid API.
3. Require explicit permission for paid AI.
4. Enforce a hard per-run budget.
5. Batch findings instead of making one call per finding.
6. Log AI usage and estimated token cost.
7. Stop when the configured budget is reached.

Never create an uncontrolled AI loop.

---

# 12. WEB ENGINE RULES

The Web Engine tests live/deployed applications.

It must:

- Require appropriate authorization.
- Validate targets.
- Enforce SSRF protections.
- Enforce timeouts.
- Limit resource usage.
- Avoid arbitrary internal-network access.
- Produce deterministic findings wherever possible.

The Web Engine must not be used as a substitute for CodeSentinel.

CodeSentinel = source code.

Web Engine = deployed application.

---

# 13. MCP ENGINE RULES

The MCP Engine is an introspection/security scanner.

It may inspect:

- Tools
- Resources
- Prompts
- Schemas
- Descriptions
- Transport metadata

It MUST NOT invoke target MCP tools during static scanning.

Never execute:

- Arbitrary target commands
- Target filesystem operations
- Target database operations
- Target API actions

The scanner must treat descriptions and metadata as untrusted data.

---

# 14. SHARED FINDING FORMAT

All engines should eventually produce a common finding structure.

A finding should contain:

- Engine
- Rule ID
- Category
- Severity
- Confidence
- File/tool/target location
- Evidence
- Explanation
- Remediation
- Related finding information when applicable

The shared format allows future correlation without merging the engines.

---

# 15. TEST-FIRST DEVELOPMENT

Every major analyzer rule must have a test fixture.

Use:

fixtures/
├── vulnerable/
├── safe/
├── borderline/
└── regression/

For every new rule:

1. Create a failing fixture.
2. Implement the rule.
3. Confirm detection.
4. Add a safe fixture.
5. Confirm it is not incorrectly detected.
6. Run the complete test suite.

Do not tune rules only against real projects.

---

# 16. QUALITY GATES

Every phase must have a measurable completion condition.

Example:

Phase 2:

- CLI works.
- Files are discovered.
- `.gitignore` is respected.
- Cache works.
- TypeScript files parse.
- Tests pass.

Phase 3:

- Bug fixtures detected.
- Clean fixtures remain clean.
- No unexplained crashes.

Phase 4:

- API mismatch fixtures detected.
- Request/response mismatches detected.
- Missing API error handling detected.

And so on.

A phase is NOT complete because the code "looks finished."

It is complete only when its tests and acceptance criteria pass.

---

# 17. TESTING REQUIREMENTS

After meaningful changes, run the relevant checks:

- Unit tests
- Integration tests
- Type checking
- Linting
- Build
- Fixture tests

Before completing a phase:

    npm test
    npm run typecheck
    npm run lint
    npm run build

Use the project's actual scripts if their names differ.

Never claim tests passed without actually running them.

---

# 18. GIT RULES

Use small, meaningful commits.

Examples:

    phase-2: add project file walker
    phase-2: add content hash cache
    phase-3: add unhandled promise rule
    phase-4: add API route matching

Do not combine unrelated features into one commit.

Do not rewrite Git history unless explicitly requested.

---

# 19. DOCUMENTATION RULE

Every important rule must document:

- What it detects.
- Why it matters.
- How it detects it.
- Confidence level.
- Known limitations.
- Example of a valid finding.
- Example of safe code.

Documentation should live close to the implementation where practical.

---

# 20. SECURITY RULES & SECURITY ANALYSIS

## 20A. General Security Practices

Never trust:

- Source code being analyzed.
- Web targets.
- MCP servers.
- Tool descriptions.
- API responses.
- Configuration files.
- External input.

Security-sensitive operations must use:

- Input validation
- Timeouts
- Resource limits
- Safe subprocess execution
- Secret redaction
- Path validation
- SSRF protection where applicable

Never execute source-code strings simply because they were discovered during analysis.

## 20B. Security Analysis Rules

When implementing Security Analysis for CodeSentinel:

- Security rules must be deterministic by default.
- Security findings must include evidence.
- Security rules must be conservative.
- Avoid regex-only security detection when AST/data-flow information is available.
- Never claim a vulnerability with insufficient evidence.
- Clearly distinguish "confirmed pattern" from "potential risk".
- Do not automatically exploit discovered vulnerabilities.
- Do not automatically modify source code.
- Security scanning must remain local by default.
- Security analysis must not require AI.
- Security rules must have fixtures (vulnerable, safe, borderline).
- Every security rule must be regression tested.
- False positives must be tracked and reduced.
- Existing CodeSentinel functionality must not regress.

---

# 21. RESOURCE CONTROL

Respect configured limits.

Examples:

- Maximum file size
- Maximum files
- Rule timeout
- Browser timeout
- MCP connection timeout
- Introspection timeout
- AI budget

Configuration must not be scattered throughout the codebase.

Keep limits centralized.

---

# 22. AGENT BEHAVIOR RULES

When receiving a development request:

### Step 1

Identify:

    Current phase
    Requested feature
    Required files
    Required tests

### Step 2

Inspect existing implementation.

### Step 3

Explain briefly what will change.

### Step 4

Implement only the requested scope.

### Step 5

Run tests.

### Step 6

Review against:

    INSTRUCTION.md
    DEVELOPMENT_RULES.md

### Step 7

Report:

    What changed
    Tests executed
    Results
    Remaining issues

Then stop.

Do not automatically continue into another phase.

---

# 23. NO FEATURE CREEP

If a task belongs to a future phase:

DO NOT implement it early.

Instead:

1. Mention that it belongs to a future phase.
2. Continue with the current requested scope.
3. Do not modify architecture unnecessarily to support it.

Future compatibility is good.

Premature implementation is not.

---

# 24. NO AI-DRIVEN ARCHITECTURE

Do not design the system around the assumption that AI will solve difficult analysis problems.

Preferred order:

    Compiler
        ↓
    AST
        ↓
    Type system
        ↓
    Static rules
        ↓
    Deterministic correlation
        ↓
    AI only when necessary

AI is an assistant, not the security engine.

---

# 25. FINAL DEVELOPMENT PRINCIPLE

The project should become powerful through:

    Better rules
    Better analysis
    Better fixtures
    Better correlation
    Better evidence

NOT through:

    More AI calls
    More dependencies
    More infrastructure
    More dashboards
    More features

Build a small, correct engine first.

Then expand it.

---

# 26. DEFINITION OF PROFESSIONAL COMPLETION

A feature is considered complete only when:

[ ] Implementation exists
[ ] Architecture rules are respected
[ ] Tests exist
[ ] Tests pass
[ ] Type checking passes
[ ] Lint passes
[ ] Build passes
[ ] Documentation is updated
[ ] No unrelated functionality was broken
[ ] Security implications were reviewed
[ ] Git commit is clean and focused

A phase is considered complete only when its phase gate passes.

---

# 27. AGENT STARTUP CHECKLIST

Before every development session:

[ ] Read INSTRUCTION.md
[ ] Read DEVELOPMENT_RULES.md
[ ] Identify current phase
[ ] Inspect repository state
[ ] Inspect recent changes
[ ] Identify exact task
[ ] Plan minimal implementation
[ ] Implement
[ ] Test
[ ] Review
[ ] Report
[ ] Stop

---

# END OF DEVELOPMENT RULES