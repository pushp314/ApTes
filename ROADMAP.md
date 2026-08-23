# Sentinel --- Development Roadmap

## 1. Project Vision

Sentinel is a unified security and testing platform built from **three
independently runnable engines**:

1.  **CodeSentinel** --- analyzes source code locally.
2.  **Web Engine / App Tester** --- tests running web applications.
3.  **MCP Sentinel** --- analyzes MCP servers for security risks.

The engines share a common finding/report format and can later correlate
their results, but they must remain independently usable.

### Core principle

> **Deterministic analysis first. AI is optional.**

The normal workflow must work with:

-   Zero AI calls
-   Zero paid API tokens
-   Local execution wherever possible
-   Explainable findings
-   Reproducible tests

------------------------------------------------------------------------

# 2. Build Order

``` text
PHASE 0
Project Rules + Bug Laboratory
        ↓
PHASE 1
CodeSentinel Foundation
        ↓
PHASE 2
CodeSentinel Bug Detection
        ↓
PHASE 3
CodeSentinel API Analysis
        ↓
PHASE 4
CodeSentinel Logic Analysis
        ↓
PHASE 5
CodeSentinel Cross-File Analysis
        ↓
PHASE 6
CodeSentinel Fixture Validation
        ↓
PHASE 7
Web Engine / App Tester
        ↓
PHASE 8
MCP Sentinel
        ↓
PHASE 9
Cross-Engine Correlation
        ↓
PHASE 10
Unified Reporting
        ↓
PHASE 11
Optional AI Assistance
        ↓
PHASE 12
Advanced Features
```

Do not skip ahead unless the current phase has met its definition of
done.

------------------------------------------------------------------------

# 3. Phase 0 --- Project Rules + Bug Laboratory

## Goal

Create the development rules and controlled testing environment before
building the scanners.

## Deliverables

-   `INSTRUCTION.md`
-   `DEVELOPMENT_RULES.md`
-   `Sentinel_Combined_Architecture_Spec.md`
-   `sentinel-lab/`
-   Known-bug fixtures
-   Known-clean fixtures
-   Expected findings manifest

## Definition of Done

-   All project rules are documented.
-   Bug laboratory exists.
-   Every fixture has a known expected outcome.
-   Clean fixtures are included.
-   No real network requests or real secrets are used.

------------------------------------------------------------------------

# 4. Phase 1 --- CodeSentinel Foundation

## Goal

Build the smallest useful local source-code scanner.

## Flow

``` text
codesentinel scan ./project
        ↓
File Walker
        ↓
.gitignore filtering
        ↓
Content Hash Cache
        ↓
TypeScript Parser
        ↓
AST
        ↓
Rule Engine
        ↓
Findings
        ↓
CLI Output
```

## Build

-   CLI
-   File walker
-   `.gitignore` support
-   Content-hash cache
-   TypeScript project loading
-   AST parsing
-   Rule interface
-   Finding interface
-   Basic reporting

## Important rule

Do not add AI.

## Definition of Done

``` bash
codesentinel scan ./project
```

can successfully:

-   discover files
-   skip ignored files
-   cache unchanged files
-   parse TypeScript
-   execute a basic rule
-   print a finding

------------------------------------------------------------------------

# 5. Phase 2 --- CodeSentinel Bug Detection

## Goal

Detect common real programming problems.

## Rules

-   Type errors
-   Null/undefined risks
-   Unhandled promises
-   Missing error handling
-   Unsafe property access
-   Unused variables/imports
-   Unreachable code
-   Unsafe return assumptions

Use the TypeScript compiler where possible instead of reinventing type
analysis.

## Definition of Done

Known bug fixtures are detected correctly.

------------------------------------------------------------------------

# 6. Phase 3 --- CodeSentinel API Analysis

## Goal

Detect broken API integrations without testing a live domain.

## Detect

-   Wrong HTTP method
-   Wrong endpoint
-   Missing route
-   Request schema mismatch
-   Response schema mismatch
-   Frontend ↔ backend mismatch
-   Missing API error handling
-   Stale API paths
-   Incorrect request/response types
-   OpenAPI contract mismatches

## Important

Use local/mock fixtures.

Do not make real requests to external services.

## Definition of Done

CodeSentinel can identify intentionally broken frontend/backend API
contracts in the laboratory.

------------------------------------------------------------------------

# 7. Phase 4 --- CodeSentinel Logic Analysis

## Goal

Find code that is syntactically valid but logically suspicious.

## Detect

-   Always-true conditions
-   Always-false conditions
-   Contradictory conditions
-   Dead code
-   Unreachable branches
-   Empty catch blocks
-   Duplicate logic
-   Suspicious comparison direction
-   Impossible conditions

## Definition of Done

Logic fixtures are detected while legitimate logic remains unflagged.

------------------------------------------------------------------------

# 8. Phase 5 --- CodeSentinel Cross-File Analysis

## Goal

Understand relationships between different parts of a project.

## Detect

-   Configuration drift
-   Duplicate configuration
-   Conflicting constants
-   Frontend/backend contract drift
-   Missing functions
-   Missing routes
-   Stale imports
-   Duplicate implementations
-   Inconsistent validation rules

## Definition of Done

CodeSentinel can reason across multiple files instead of treating every
file independently.

------------------------------------------------------------------------

# 9. Phase 6 --- CodeSentinel Fixture Validation

## Goal

Prove that CodeSentinel works before moving to another engine.

## Test against

``` text
sentinel-lab/
├── bugs/
├── api-bugs/
├── logic-bugs/
├── type-bugs/
├── security-bugs/
├── configuration/
├── missing-code/
└── clean/
```

## Target

``` text
Known bugs
    ↓
Maximum possible detection

Clean code
    ↓
Zero critical/high false positives
```

Do not claim detection percentages until they are measured from actual
runs.

## Definition of Done

-   Fixture runner works.
-   Expected findings can be compared with actual findings.
-   Regression testing is possible.
-   CodeSentinel is stable enough to use on real local projects.

------------------------------------------------------------------------

# 10. Phase 7 --- Web Engine / App Tester

## Goal

Build the external application testing engine.

Unlike CodeSentinel:

> Web Engine tests a running application.

## Core checks

### QA

-   Page availability
-   Broken links
-   Broken images/scripts
-   Form problems
-   Console errors
-   Basic performance observations
-   Page structure problems

### API/runtime checks

-   Failed API requests
-   HTTP errors
-   Broken frontend API calls
-   Runtime integration failures

### Security

-   Security headers
-   Cookie flags
-   CORS configuration
-   Mixed content
-   Exposed sensitive paths
-   Other deterministic web-security checks

### AI/widget awareness

Detect embedded AI/chat/agent interfaces.

Do not turn this into a full AI red-team engine in the MVP.

## Definition of Done

Web Engine can independently scan a permitted test application and
generate structured findings.

------------------------------------------------------------------------

# 11. Phase 8 --- MCP Sentinel

## Goal

Build a deterministic MCP security scanner.

## Flow

``` text
MCP Server
    ↓
MCP Client
    ↓
Introspection
    ↓
Tools / Resources / Prompts
    ↓
Deterministic Rules
    ↓
Findings
```

## Detect

-   Unsafe schemas
-   Unbounded string parameters
-   Missing validation
-   Excessive capabilities
-   Unscoped filesystem access
-   Unscoped shell access
-   Destructive capabilities without safeguards
-   Suspicious tool descriptions
-   Hidden Unicode
-   Prompt-injection-via-metadata patterns
-   Known vulnerability patterns
-   Transport/authentication problems
-   TLS/CORS problems
-   Ambiguity/hallucination-risk heuristics

## Critical security rule

> Never invoke target MCP tools during static/introspection scanning.

## Definition of Done

MCP Sentinel can safely inspect a target and produce deterministic
findings without executing its tools.

------------------------------------------------------------------------

# 12. Phase 9 --- Cross-Engine Correlation

## Goal

Connect the engines without merging their internal architectures.

``` text
CodeSentinel
     │
     ├─────────────┐
     │             │
     ↓             ↓
Web Engine ←→ Correlation ←→ MCP Sentinel
```

## Examples

### Code vs deployed API

CodeSentinel:

> Frontend expects `/api/users`.

Web Engine:

> Deployed application uses `/api/user`.

Sentinel:

> Possible API/deployment drift.

### Web + MCP

Web Engine:

> Application contains an AI widget.

MCP Sentinel:

> Connected MCP server exposes an overly privileged tool.

Sentinel:

> High-risk application-to-MCP connection.

## Important

Correlation is optional.

Each engine must still work independently.

------------------------------------------------------------------------

# 13. Phase 10 --- Unified Reporting

## Goal

Give the user one consistent way to understand findings.

All engines should use a common finding structure:

``` text
Engine
Category
Rule ID
Severity
Confidence
Location
Evidence
Explanation
Remediation
```

## Outputs

-   CLI
-   JSON
-   Markdown
-   HTML

## Unified view

``` text
Sentinel
├── Code Findings
├── Web Findings
├── MCP Findings
└── Correlated Findings
```

------------------------------------------------------------------------

# 14. Phase 11 --- Optional AI Assistance

## Goal

Use AI only where deterministic rules genuinely cannot provide enough
judgment.

AI is:

-   Optional
-   Off by default
-   Secondary
-   Budget limited
-   Preferably local

## CodeSentinel

Use local Ollama first.

Configured paid APIs must require explicit permission.

## MCP Sentinel

AI may review low-confidence ambiguity findings.

## Web Engine

AI may help interpret genuinely ambiguous results.

## AI must NOT

-   Replace deterministic rules
-   Be required for normal scans
-   Automatically introduce critical findings
-   Override high-confidence deterministic findings
-   Make uncontrolled API calls

------------------------------------------------------------------------

# 15. Phase 12 --- Advanced Features

Only begin after the MVP is stable.

Possible features:

-   Scan history
-   Finding diffing
-   Regression detection
-   CI/CD integration
-   GitHub Actions
-   Pull-request checks
-   MCP registry/badges
-   Enterprise dashboard
-   Multi-project management
-   Advanced correlation
-   More programming languages
-   More web security checks
-   More MCP security rules

These are NOT MVP requirements.

------------------------------------------------------------------------

# 16. AI / Token Policy

This is a permanent project rule.

## Default

``` text
AI = OFF
Paid API = OFF
Tokens spent = 0
```

Normal deterministic scanning must never require AI.

## If AI is enabled

``` text
Rule Engine
     ↓
Low-confidence findings only
     ↓
Batch findings
     ↓
Local model first
     ↓
Hard budget
     ↓
AI result
```

Never use:

``` text
for every finding:
    call AI
```

Prefer:

``` text
all low-confidence findings
        ↓
one/minimum number of batched calls
```

------------------------------------------------------------------------

# 17. Development Discipline

For every phase:

``` text
1. Read project rules
        ↓
2. Understand architecture
        ↓
3. Define small task
        ↓
4. Implement
        ↓
5. Test
        ↓
6. Test against Bug Laboratory
        ↓
7. Review findings
        ↓
8. Fix regressions
        ↓
9. Document
        ↓
10. Mark phase complete
```

Never build multiple major phases simultaneously.

------------------------------------------------------------------------

# 18. Agent Rules

The development agent must:

1.  Read `INSTRUCTION.md` before work.
2.  Read `DEVELOPMENT_RULES.md`.
3.  Read `Sentinel_Combined_Architecture_Spec.md`.
4.  Inspect the current project state before modifying anything.
5.  Follow the current roadmap phase.
6.  Never silently change architecture.
7.  Never add unnecessary dependencies.
8.  Never introduce AI into deterministic paths.
9.  Never skip tests.
10. Never claim a feature works without validation.
11. Keep engines independently runnable.
12. Document important architectural decisions.
13. Stop after completing the assigned phase/task.
14. Ask for clarification when requirements conflict rather than
    inventing a new architecture.

------------------------------------------------------------------------

# 19. Phase Completion Checklist

Before marking any phase complete:

-   [ ] Implementation complete
-   [ ] Tests added
-   [ ] Existing tests pass
-   [ ] Bug Laboratory relevant fixtures pass
-   [ ] No unexpected regressions
-   [ ] No unnecessary dependencies
-   [ ] No accidental AI/API usage
-   [ ] Documentation updated
-   [ ] CLI behavior verified
-   [ ] Git diff reviewed
-   [ ] Known limitations documented

Only then move to the next phase.

------------------------------------------------------------------------

# 20. Final MVP Architecture

At the end of the MVP:

``` text
                         SENTINEL
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    CodeSentinel        Web Engine       MCP Sentinel
          │                 │                 │
          │                 │                 │
     Source Code       Running App       MCP Server
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
                     Finding Format
                            │
                            ▼
                       Correlation
                            │
                            ▼
                    Unified Reporting
                            │
                            ▼
                    Optional Local AI
```

The three engines remain independently usable.

The unified platform is an integration layer, not a replacement for the
individual engines.

------------------------------------------------------------------------

# 21. The Most Important Principle

Do not optimize for building the largest system.

Optimize for:

``` text
Correctness
    ↓
Testability
    ↓
Low false positives
    ↓
Explainability
    ↓
Security
    ↓
Performance
    ↓
Features
```

A small scanner that produces trustworthy findings is more valuable than
a huge scanner that produces noise.

**Build CodeSentinel first. Prove it. Then build Web Engine. Then MCP
Sentinel. Then connect them.**
