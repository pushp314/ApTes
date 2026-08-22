# Sentinel — Unified Web Application & AI Agent Security Testing Platform

*(Working name — combines App Tester + MCP Sentinel into one cloud platform, with CodeSentinel connected as a standalone local tool via optional import. Rename freely.)*

---

## 1. Project Description

Sentinel is a single platform that tests **both layers of a modern web application**: the website itself (availability, structure, forms, links, security headers) and, where the site embeds an AI agent or chatbot, the **MCP servers that agent is actually wired to** behind the scenes.

These were originally two separate tools — App Tester (deterministic website QA + security scanning) and MCP Sentinel (MCP server schema/privilege scanning). They're being combined because they answer one question that neither answers alone: **"Is this application, end to end, actually safe and working — including the AI agent it talks to?"**

A site can pass every QA and security header check and still be sitting on top of a critically vulnerable MCP server. A vulnerable MCP server, tested in isolation, tells you nothing about whether it's actually exposed through a live product. Sentinel tests both and — where possible — correlates them into one finding: *"your site is fine, but the agent it calls has a critical, exploitable tool definition."* That correlation is the actual product.

---

## 2. The Problem This Solves

* **Web QA and security gaps ship silently.** Broken links, broken forms, missing security headers — common on small/mid-size sites because nobody checks by default.
* **AI agents are being bolted onto websites faster than they're secured.** Chat widgets and embedded agents increasingly connect to backend tools via MCP, and the MCP ecosystem is documented to be insecure by default at scale (most MCP servers score failing grades in independent audits; disclosed CVEs already exist).
* **These two problems are currently invisible to each other.** A web QA tool has no idea an MCP server exists behind the chat widget it just clicked past. An MCP scanner run in isolation has no idea whether the vulnerable server it found is actually reachable from a public-facing product, or an internal dev-only instance nobody will ever expose. Neither tool alone tells you your actual real-world risk.
* **Small teams can't afford three different vendors** (a QA tool, a security scanner, an AI security platform) to get a full picture. One platform, one report, one score.

---

## 3. What We Are Building — Two Engines, One Platform

### Web Engine (from App Tester)

* **Tier 1 — Core QA:** availability, page structure, broken links/images/scripts, form discovery and safe validation, console errors, basic performance metrics.
* **Tier 2 — Security Scan:** missing security headers, cookie flags, mixed content, exposed sensitive paths, open redirects, CORS misconfiguration, TLS issues.
* **Tier 3 — AI Widget Detection:** detects chat widgets / embedded agents on the page. Does not attempt to out-build dedicated red-teaming tools — its job here is narrower and more valuable: **find and characterize what the site is actually connected to**, and hand that off to the MCP Engine.

### MCP Engine (from MCP Sentinel)

* **Schema Rigor:** unbounded parameters, missing/weak input schemas.
* **Privilege & Capability Analysis:** unscoped filesystem/shell/network tools, destructive verbs without safeguards.
* **CVE/Pattern Matching:** signature set against publicly disclosed MCP vulnerabilities.
* **Auth & Transport Checks:** missing auth, non-TLS, permissive CORS on remote MCP servers.
* **Ambiguity/Hallucination-Risk Heuristics:** vague tool descriptions likely to cause LLM misrouting — flagged at lower confidence by design, to keep the false-positive rate down.

### Discovery Bridge (new — this is what makes combining them worth doing)

* While the Web Engine runs, a Discovery module inspects outbound network calls, page config, and any `.well-known` MCP-discovery style endpoints for evidence that the site's chat widget/agent is backed by an MCP server.
* If a target is found (or the user manually supplies one — see MVP scope below), it is queued into the MCP Engine **as a separate, explicitly authorized job**, not scanned automatically without consent.
* Findings from both engines are tied to the same Project record so the dashboard can show them together and — where a Web Engine finding and an MCP Engine finding are related (e.g. the exact chat widget that triggered the MCP scan) — link them explicitly in the report.

**MVP scope decision:** automatic discovery is genuinely hard to do reliably and safely (you don't want to be silently probing infrastructure the user never confirmed). For v1, ship **manual MCP target linking** — the user adds a Project with a website URL *and*, optionally, one or more known MCP server targets (local command or remote URL) associated with it. Automatic discovery is a real Phase 2+ feature once the manual flow is proven, not an MVP requirement.

### Code Engine (from CodeSentinel) — connected, but deliberately NOT merged in

CodeSentinel stays a **separate, local-only, standalone tool.** It is not added as a third cloud worker type, and it never gains network access to a live target. That boundary is intentional and load-bearing:

* It requires no authorization gate, because it never touches anything but your own filesystem.
* It stays free to run constantly during development, because nothing goes over a network and no AI is called by default.
* Folding it into the Redis/Postgres/dashboard architecture would either force it to become a networked service (destroying the property that makes it useful) or bolt on a second execution model for no real gain.

What it *does* gain from the platform is a way to feed its findings into a correlated report, on your terms, when you choose to:

* Code Engine's findings already use the shared `Finding` shape (Section 6) locally.
* Running `codesentinel scan ./project --export sentinel-import.json` produces a portable findings file.
* That file can be uploaded to a Sentinel Project (`POST /api/projects/:id/code-scan-import`) as a point-in-time snapshot, tagged `engineType: "code"`.
* Where a Code Engine finding and a Web Engine finding both concern the same API contract — Code Engine says "this client expects `{id, name, email}`", Web Engine's live check says "this endpoint currently returns `{userId, fullName}`" — the aggregator links them as a **drift finding**: the code and the live deployment have diverged. This is a genuinely new finding category, and it's the actual payoff of connecting the two, not merging them.
* If no code-scan import exists for a project, the report simply omits that section — same "don't assume all engines ran" rule as the Web/MCP combination.

This keeps the boundary clean: **Web and MCP are live-target engines that require consent and run centrally; Code is a local tool that runs on your machine and is imported by choice.**

---

## 4. User Flow

1. User creates a **Project**: target website URL, and optionally one or more associated MCP server targets (local stdio command or remote URL).
2. User confirms an **authorization statement** — they own or have written permission to test both the website and the listed MCP server(s). Logged against the project.
3. User clicks **Start Test**.
4. Backend creates a **TestRun** and enqueues jobs:
   * A Web Engine job (Tiers 1–3) against the site.
   * An MCP Engine job for each linked MCP target, run in parallel.
5. Workers pick up jobs. Web Engine drives a sandboxed Playwright session; MCP Engine connects via the MCP SDK in introspection-only mode against a sandboxed subprocess (for local targets) or directly (for remote targets, read-only).
6. Each engine writes findings to the shared `Finding` table, tagged with `engineType: "web" | "mcp"` and linked to the same `TestRun`.
7. Dashboard polls for live progress, showing both engines' status side by side.
8. On completion, the user sees a **unified report**: overall score, Web findings, MCP findings, and any explicitly correlated findings (e.g., "Chat widget on `/support` page connects to MCP target `support-agent-mcp`, which has 2 critical findings").
9. User downloads a combined HTML/JSON report and works through remediation.
10. Re-running the project only re-scans what's changed where possible (cache by content hash for MCP targets' tool manifests; standard re-crawl for the website, since live sites can't be hash-cached the same way).

---

## 5. Architecture

```
                              +--------------------+
                              |   React Dashboard   |
                              +----------+---------+
                                         |
                                         v  HTTP
                              +--------------------+
                              |     API Server      |
                              |   Node + Express    |
                              +----------+---------+
                                         |
                        +----------------+----------------+
                        v                                  v
                  PostgreSQL                          Redis Queue
              (Projects, TestRuns,                   (BullMQ jobs)
               Findings - shared                          |
               schema across                              v
               both engines)                    +--------------------+
                        ^                        |   Job Orchestrator  |
                        |                        +----+-----------+---+
                        |                             |           |
                        |                    Web Engine Job   MCP Engine Job
                        |                             |           |
                        |                             v           v
                        |                    +----------------+ +------------------+
                        |                    |  Web Worker     | |   MCP Worker      |
                        |                    |  (Playwright,    | |  (MCP SDK client,  |
                        |                    |   sandboxed)     | |   sandboxed        |
                        |                    +--------+--------+ |   subprocess for    |
                        |                             |          |   local targets)    |
                        |                             |          +---------+----------+
                        |                             v                    v
                        |                    Target Website          Target MCP Server
                        |                             |                    |
                        |                             v                    v
                        |                    +----------------+  +------------------+
                        |                    | Tier 1/2/3 Rule |  |  Schema/Privilege/ |
                        |                    | Modules + AI    |  |  CVE/Auth/Ambiguity|
                        |                    | Widget Detector |  |  Rule Modules      |
                        |                    +--------+--------+  +---------+---------+
                        |                             |                    |
                        +-----------------------------+--------------------+
                                                        |
                                                        v
                                              +--------------------+
                                              |    Aggregator &     |
                                              |    Correlator       |
                                              +----------+---------+
                                                         |
                                     +-------------------+-------------------+
                                     v                   v                   v
                              CLI/Dashboard         JSON Report        HTML Report
                                Summary
```

---

## 6. Unified Data Model

Both engines write to the **same** `Finding` table — this is the single most important architectural decision in combining them, because it's what makes the correlated report possible without bolting two products together after the fact.

```text
Project
- id
- name
- targetUrl
- mcpTargets[]        (array of { name, transport, command|url })
- authorizationConfirmed (bool, timestamp, by whom)
- createdAt / updatedAt

TestRun
- id
- projectId
- status
- startedAt / completedAt
- webEngineStatus      (pending | running | completed | failed | skipped)
- mcpEngineStatus[]    (one per linked MCP target)
- overallScore
- webScore
- mcpScore

Finding
- id
- runId                (nullable — a Code Engine import isn't tied to a
                         live TestRun, it's tied directly to the Project;
                         see CodeScanImport below)
- projectId
- engineType           ("web" | "mcp" | "code")
- ruleId
- category
- severity
- confidence           ("high" | "low")
- message
- evidence (jsonb)
- remediation
- relatedFindingId      (nullable — links a Web finding to the MCP finding
                          it triggered discovery of, or to the Code finding
                          it drifted from; drift correlations are directional
                          and explicit, never inferred silently)
- createdAt

CodeScanImport
- id
- projectId
- importedAt
- toolVersion          (CodeSentinel version, for reproducibility)
- sourceCommitHash      (optional — which commit this scan was run against)
```

Keep this schema simple. Do not create separate `WebFinding` / `MCPFinding` / `CodeFinding` tables — the shared shape is what lets the dashboard, the scorer, and the report generator treat all three engines identically, and it's what makes the correlation features (Section 3) a query, not a special case. `Finding.runId` is nullable specifically because Code Engine results arrive via import, not via a queued job — don't force an artificial `TestRun` just to satisfy a NOT NULL constraint.

---

## 7. Core Interfaces

Both engines implement the **same** rule interface, unified from App Tester's `TestCase` and MCP Sentinel's `ScanRule`:

```typescript
interface EngineRule {
  id: string;
  name: string;
  engineType: "web" | "mcp";
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "high" | "low";

  evaluate(context: EngineContext): Finding[];
}

// Web engine context wraps a Playwright Page + the current TestRun
// MCP engine context wraps a TargetManifest (tools/resources/prompts) + the current TestRun
interface EngineContext {
  runId: string;
  engineType: "web" | "mcp";
  webContext?: { page: Page; targetUrl: string };
  mcpContext?: { manifest: TargetManifest; serverMeta: ServerMetadata };
}
```

New rules for either engine plug into the same orchestrator without touching the queue, the API, or the dashboard — this was true in both original specs individually, and stays true combined.

---

## 8. The AI Boundary (applies platform-wide)

Same non-negotiable rule as both source projects, now stated once for the whole platform:

* The deterministic rule engines — Web Tiers 1–2, and all MCP rule categories — must produce a complete, trustworthy report with **zero AI calls**.
* AI is optional, off by default, and enters at exactly two bounded points:
  1. **Web Tier 3 AI Widget Detection** — orchestrates existing open-source red-teaming tools (per the earlier validation: don't rebuild Promptfoo/Garak, call them) for a small, explicitly-authorized probe set. Never the platform's own hand-rolled probe generation.
  2. **MCP Ambiguity Assist** — confirms or downgrades already-flagged low-confidence findings only; cannot introduce new finding categories.
* Both AI entry points respect a shared budget/cost-control system (same design as CodeSentinel): local model default where feasible, hard per-run call budget, batched calls, visible cost logging, `--no-ai`/`--allow-paid-ai` equivalent flags at the project level.

---

## 9. Security & Authorization Requirements

* **Explicit authorization gate at the Project level**, covering both the website and every linked MCP target, logged with timestamp — no scan starts without it.
* **SSRF protection** for the Web Engine: block localhost, private IP ranges, cloud metadata endpoints.
* **Sandboxed subprocess execution** for local MCP targets: no network access, restricted filesystem, hard timeout — never trust a target server during introspection.
* **No destructive actions**: Web Engine never submits payments/deletions/purchases; MCP Engine never invokes tool functions, introspection only.
* **Hard resource limits** on both engines: max links/pages crawled, max MCP tools scanned, max test duration, max concurrent runs — configurable, not hardcoded.
* **Consent scope is per-target, not global** — adding a new MCP target to an existing project requires re-confirming authorization for that specific target.

---

## 10. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript, Vite, Tailwind | One dashboard for both engines |
| API | Node + Express + TypeScript, Zod validation | |
| Queue | Redis + BullMQ | One orchestrator dispatches to either worker type |
| Web Worker | Playwright | Unchanged from App Tester spec |
| MCP Worker | `@modelcontextprotocol/sdk` (introspection only) | Unchanged from MCP Sentinel spec |
| Database | PostgreSQL + Prisma | Shared `Finding` schema (Section 6) |
| AI Assist (optional) | Local model via Ollama by default; paid API opt-in | Shared budget/cost-control layer |
| Reporting | Server-rendered HTML report + JSON export | Combined Web + MCP sections in one document |

---

## 11. What You Need Before Building — Prerequisites Checklist

**Environment / tooling**
- [ ] Node.js + TypeScript toolchain set up (monorepo — reuse the App Tester monorepo structure, add an `mcp-worker` package alongside `web-worker`)
- [ ] Docker + docker-compose for local PostgreSQL and Redis
- [ ] Playwright installed with browser binaries
- [ ] `@modelcontextprotocol/sdk` installed and a couple of real MCP servers available locally to test against (the official reference servers are a reasonable, if imperfect, starting point given they're documented to have real findings)
- [ ] Ollama installed locally if you want the AI Assist layer working from day one (optional — can be deferred to its own phase)

**Design decisions to lock before writing code** (these are the ones that are expensive to change later)
- [ ] Confirm the shared `Finding` schema (Section 6) — do not let the two engines drift into separate tables under time pressure, that's the whole point of combining them
- [ ] Confirm MVP scope explicitly excludes automatic MCP discovery (Section 3) — manual linking only for v1
- [ ] Decide the scoring model: one overall score, or two sub-scores (Web/MCP) shown alongside an overall — recommend the latter, since a site with a clean web layer and a broken MCP layer needs to visibly show *where* the risk is, not just a blended number that hides it
- [ ] Decide authorization UX: a simple checkbox is enough for MVP, but decide now whether you log IP/timestamp/user identity alongside it, since retrofitting audit logging later is more painful than building it in from the start

**Fixtures — build both sets before tuning any rule**
- [ ] Web fixtures (from the original App Tester spec: healthy site, broken-links site, console-error site, broken-images site, invalid-form site)
- [ ] MCP fixtures (from the MCP Sentinel spec: known-vulnerable, known-safe, borderline-ambiguous servers)
- [ ] At least one **combined fixture**: a small test site with an embedded chat widget wired to a fixture MCP server with a known, deliberate vulnerability — this is the fixture that actually validates the correlation feature, which is the reason this platform exists rather than two separate tools

**Skills / learning curve to budget time for**
- [ ] MCP protocol / JSON-RPC transport details (stdio vs. SSE vs. HTTP) — new to you, budget real learning time here
- [ ] BullMQ job orchestration across two different worker types sharing one queue — straightforward extension of what App Tester already needed, but worth confirming the pattern before scaling to two engines
- [ ] Playwright network-request inspection (for the Discovery Bridge, even the manual-linking v1 benefits from being able to show the user what network calls a page makes, so they can identify their own MCP targets)

---

## 12. Development Phases

**Phase 1 — Foundation**
Monorepo extended with `packages/mcp-worker` alongside the existing App Tester structure. Shared Prisma schema (Section 6). Redis/BullMQ orchestrator that can dispatch to either worker type.

**Phase 2 — Web Engine (Tiers 1–2)**
Port App Tester's deterministic QA + security modules into the unified `EngineRule` interface.

**Phase 3 — MCP Engine (Schema, Privilege, CVE, Auth)**
Port MCP Sentinel's deterministic modules into the same `EngineRule` interface.

**Phase 4 — Unified Dashboard & Reporting**
Project creation with website + optional MCP targets, combined progress view, combined report (Web section + MCP section, both present even when only one engine ran).

**Phase 5 — Fixture Validation (both engines + the combined fixture)**
Hit detection/false-positive targets from both original specs. Validate the combined fixture produces a correctly correlated finding.

**Phase 6 — Web Tier 3 (AI Widget Detection) + MCP Ambiguity Heuristics**
Both still deterministic/orchestration-based, no AI dependency yet.

**Phase 7 — Optional AI Assist Layer (platform-wide)**
Shared budget/cost-control system, local-model default, applies to both engines' ambiguous-finding queues.

**Phase 8 — Discovery Bridge (post-MVP)**
Automatic detection of MCP targets from a website scan. Explicitly deferred — do not start this until Phases 1–7 are stable and the manual-linking flow has real usage.

**Phase 9 — Code Engine Import (post-MVP, independent of Phase 8)**
Build and ship CodeSentinel as its own standalone tool first (it has no dependency on any of this). Once stable, add the `--export` flag and the `code-scan-import` API endpoint, and extend the aggregator to produce drift findings between imported Code Engine results and live Web Engine findings on the same project. This phase does not require Phase 8 to be done first — they're independent extensions.

---

## 13. MVP Definition of Done

```text
User creates a Project with a website URL and one manually-linked MCP target
   |
User confirms authorization for both
   |
Start Test triggers a Web Engine job and an MCP Engine job in parallel
   |
Both write Findings to the shared table, tagged by engineType
   |
Dashboard shows combined live progress
   |
Completed report shows Web findings, MCP findings, and overall + sub-scores
   |
Combined fixture (site + linked vulnerable MCP server) produces a correctly
correlated finding
   |
Everything above works with zero AI calls made
```

---

## 14. Engineering Rules for the Agent

1. Do not build two products that happen to share a database — the shared `Finding` schema and unified `EngineRule` interface are the actual point of this merge; do not let time pressure fork them into engine-specific tables or interfaces.
2. Do not build automatic MCP discovery in the MVP — manual linking only, per Section 3's explicit scope decision.
3. Keep both engines' deterministic rule sets fully AI-free; the shared AI Assist layer is additive and optional, same as both source specs required individually.
4. Sandbox both engines' interactions with their targets — Playwright for web, subprocess isolation for local MCP servers — neither engine should ever trust its target.
5. Build all three fixture sets (web, MCP, combined) before tuning severity weights on either engine.
6. Authorization is per-target and logged — a new MCP target added to an existing project requires its own confirmation, not inherited from the project's original consent.
7. The combined report must show both sections even when only one engine ran for a given TestRun (e.g., a project with no MCP targets linked yet) — never assume both are always present.
8. Reuse App Tester's and MCP Sentinel's existing worker code where the interfaces align — this is a merge, not a rewrite.
9. Never give Code Engine (CodeSentinel) network access to live targets or fold it into the Redis/Postgres worker architecture — it stays a standalone local CLI tool that connects to the platform only via explicit, user-initiated import, never as a queued job.
10. A drift finding (Code vs. Web) must only be created when both a Code Engine import and a Web Engine run exist for the same project — never infer one from the other's absence.
