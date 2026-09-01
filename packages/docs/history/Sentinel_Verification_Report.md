# Sentinel — Independent Verification Report

*Verified by direct code inspection against `INSTRUCTION.md` / the architecture spec. Not based on the repo's own self-authored audit files — several of those were found to be stale or incorrect (see Section 5).*

**Method note:** my sandbox has no network access, so I could not run `npm install && npm test` end-to-end — the `tsc` errors I saw were "cannot find module" errors from missing `node_modules`, not real type errors. Everything below is verified by reading the actual source, not by running it. **You should run `npm install && npm run typecheck && npm test` locally and share the output** so we can confirm the runtime behavior matches what the code claims to do.

---

## CRITICAL

### 1. SSRF protection is bypassed on every platform-orchestrated scan
**File:** `packages/platform/src/orchestrator.ts`
```typescript
const webResult = await runWebEngine(project.webUrl, webRules, project.id,
  { scanTimeoutMs: timeoutMs, allowLocal: true });
```
`allowLocal: true` is hardcoded, not derived from any flag or config. This means the well-built SSRF protection in `packages/web/src/security.ts` (which is genuinely solid — DNS-resolution checking to prevent rebinding, correct RFC 1918 ranges, correct metadata-endpoint blocking) **never actually runs** when a scan goes through the real entry point — only when the standalone `web` CLI is used directly without the flag.

One of the repo's own audit files (`FINAL_MVP_AUDIT.md`) explicitly claims *"SSRF protected (`allowLocal: false` by default in production)"* — **this claim is false against the current code.** This is exactly the kind of thing a self-written audit will miss if it's checking that the SSRF function exists rather than checking every call site that could bypass it.

**Fix:** remove the hardcoded `allowLocal: true`; wire it to an explicit, defaulted-to-`false` option on `ProjectDefinition`.

### 2. No authorization/consent gate exists anywhere
**Files checked:** `packages/platform/src/orchestrator.ts`, `packages/web/src/cli.ts`, `packages/mcp/src/cli.ts`

`grep`-ing the whole codebase for authorization/consent logic returns only comments (`// requires authorization`) — never an actual check. `ProjectDefinition` (the orchestrator's input type) has no `authorizationConfirmed` field. `runUnifiedPlatform()` begins scanning immediately on call with no gate. The Web Engine's own CLI takes a raw URL and scans it with zero confirmation step.

This is Golden Rule #5 in the instructions doc and Section 7A of the architecture spec — currently not implemented at all, not partially implemented.

**Fix:** add `authorizationConfirmed: boolean` (plus timestamp) to `ProjectDefinition`, and have `runUnifiedPlatform` / both CLIs refuse to enqueue a scan without it, at the function level — not just a frontend checkbox that can be bypassed by calling the code directly.

---

## HIGH

### 3. CodeSentinel has an undeclared runtime dependency on the platform package
**File:** `packages/codesentinel/src/cli.ts`
```typescript
const { AiReviewer } = await import('@sentinel/platform');
```
`packages/codesentinel/package.json` does **not** list `@sentinel/platform` as a dependency — this only works today because npm workspaces hoist everything into one shared `node_modules`. If CodeSentinel were ever extracted as a standalone published package (which is the explicit point of keeping it independent — Section 12 of the spec, Golden Rule #9), this import would break immediately.

**Fix:** either declare the dependency explicitly and accept the coupling, or (better, matching the spec's intent) give CodeSentinel its own small, local AI-assist implementation rather than reaching into `platform`.

### 4. MCP subprocess sandboxing is timeout-only, not actually sandboxed
**File:** `packages/mcp/src/runner.ts`

The code has an honest comment acknowledging this: *"In a real production environment, you'd want even stricter sandboxing like containerization."* Right now, a local MCP target subprocess gets a timeout via `Promise.race`, but no network restriction and no filesystem restriction — the spec (Section 7B) explicitly calls for both. Since the MCP Engine's core selling point is safely analyzing potentially-untrusted MCP servers, this is a real gap between the promise and the implementation, not a nice-to-have.

**Fix:** at minimum, restrict `env` to an explicit allowlist by default (currently it silently inherits the parent environment if `options.env` is undefined) and document the sandboxing gap clearly until real subprocess isolation is added.

---

## MEDIUM

### 5. The flagship correlation feature only fires on a fixture-only marker
**File:** `packages/web/src/rules/ai-widget.ts`
```typescript
const els = document.querySelectorAll('[data-mcp-target]');
```
AI widget detection looks for a literal, custom `data-mcp-target` HTML attribute. No real website — not a client's Next.js chat widget, not Intercom, not Drift — will ever have this attribute. This means the whole "critically vulnerable AI agent exposed on frontend" correlation finding (the actual reason Web + MCP were combined into one platform) currently **only works against your own test fixture**, not any real target. It'll look great in a demo and find nothing in production.

**Fix:** this needs real heuristics — common chat-widget script/iframe patterns, known vendor class names, or (more robustly) inspecting outbound `fetch`/`XHR` calls the page makes for anything resembling an MCP endpoint — before this feature can be called done, even at MVP quality.

### 6. Fixtures are thinner than the spec calls for
- **MCP:** one `server.json` manifest file — not the known-vulnerable / known-safe / borderline *running servers* the spec asks for (Section 12 of the MCP Sentinel spec).
- **Web:** one `index.html` — not the separate healthy-site / broken-links-site / console-error-site / broken-images-site / invalid-form-site fixtures originally spec'd.
- **CodeSentinel:** `safe/` and `vulnerable/` exist and are wired into tests — better shape than the other two — but no `borderline/` set yet.

This matters because the entire "lower false-positive rate than existing tools" pitch (for MCP especially) is unverifiable without real fixture-based measurement, and right now there isn't enough fixture coverage to measure it honestly.

### 7. No Platform-level CLI exists yet
There's no way to run `sentinel scan` end-to-end today — only the two sub-engine debug CLIs (`web scan <url>`, presumably `mcp scan`). `runUnifiedPlatform()` exists as a function but nothing calls it from a terminal. The repo's own audit already caught this one correctly, for what it's worth.

---

## WHAT'S GENUINELY GOOD (verified, not assumed)

- **MCP introspection-only rule holds completely** — I grepped the whole `mcp` package for `callTool`; zero matches. Only `listTools`/`listResources`/`listPrompts` are ever called. This is the single most safety-critical MCP rule and it's solid.
- **The shared `Finding` schema matches the spec closely**, down to the nullable `runId` for CodeSentinel imports and `relatedFindingId` for correlation — and the code comments cite the exact spec sections they're implementing. Real discipline here.
- **The AI boundary is well implemented**: off by default, budget defaults to 0 (meaning "no AI" is the true default, not just "flag exists"), only touches low-confidence findings, batches in groups of 10, redacts secrets before anything reaches Ollama, caches by fingerprint, and honestly reports skipped findings when the budget runs out rather than silently dropping them.
- **No paid AI provider is wired in at all** — stricter than the spec required, not a gap.
- **Secret redaction patterns are reasonable** (API keys, bearer tokens, credentials embedded in URLs, AWS keys).
- **CodeSentinel is otherwise cleanly decoupled** — zero declared dependency on `web`/`mcp`/`platform` apart from the one undeclared AI-flag import above.
- **CodeSentinel has 9 real, substantive rule detectors** (64–114 lines each, genuine AST logic via `ts-morph`), all registered in `ACTIVE_RULES` — not stubs, contrary to what one of the repo's own audit files claims (see below).
- **The Web↔MCP correlation logic itself, once triggered, is real working code** — not a stub — matching the "explicit, directional, never inferred silently" rule from the spec.

---

## A note on the self-authored audit files

The repo contains `FINAL_MVP_AUDIT.md`, `AI_AUDIT.md`, `PHASE_13_AUDIT.md`, and several others written by the building agent itself. I checked specific claims in `FINAL_MVP_AUDIT.md` against the actual code and found it to be a mix of accurate (missing platform CLI, correctly caught) and **actively wrong**:

- It claims CodeSentinel's "API" and "Security" rule categories are `MISSING` — I found `api-integration.ts`, `secrets.ts`, `injection.ts`, and `auth.ts`, all substantive and all registered in `ACTIVE_RULES`.
- It claims SSRF is *"protected by default in production"* — the orchestrator hardcodes the bypass (Critical Finding #1 above).

**Takeaway: treat every self-generated audit in this repo as a claim to verify, not a fact to trust** — some are stale snapshots from earlier phases, and at least one materially misrepresents a security-relevant default. This is precisely why an independent check was worth doing.

---

## Priority order to fix

1. **Critical #1 (SSRF bypass)** — this is the one that could actually cause harm if you point the platform at a target today. Fix before running this against anything real.
2. **Critical #2 (authorization gate)** — same urgency, same reason.
3. **High #3 (CodeSentinel/platform coupling)** — cheap fix, prevents future breakage.
4. **High #4 (MCP sandboxing)** — real but lower urgency than 1/2 since it protects *you* from a malicious target, not a third party from you.
5. **Medium #5 (AI widget detection)** — needed before the correlation feature is honestly demoable against anything but your own fixture.
6. **Medium #6/#7** — fixture depth and the missing platform CLI, both needed before you'd call this MVP-complete.
