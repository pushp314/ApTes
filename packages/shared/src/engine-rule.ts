/**
 * EngineRule — the shared rule interface for Web and MCP engines.
 *
 * Both engines implement this same interface so that new rules can be
 * plugged into the orchestrator without touching the queue, API, or dashboard.
 *
 * Defined by: Architecture Spec Section 7.
 *
 * Note: CodeSentinel has its own internal rule structure since it runs
 * independently as a local tool. It only shares the Finding output shape,
 * not the EngineRule execution interface.
 */

import type { Severity, Confidence } from './types.js';
import type { Finding } from './finding.js';

// ---------------------------------------------------------------------------
// Engine Rule
// ---------------------------------------------------------------------------

/**
 * A single detection rule for the Web or MCP engine.
 *
 * Rules must be:
 * - Deterministic (no AI dependency)
 * - Conservative (prefer lower confidence over false positives)
 * - Documented (what it detects, why it matters, known limitations)
 * - Tested (fixture for detection, fixture for non-detection)
 */
export interface EngineRule {
  /** Unique rule identifier (e.g., "api-500-error", "unbounded-params"). */
  id: string;

  /** Human-readable rule name. */
  name: string;

  /**
   * Which engine this rule belongs to.
   * Only "web" or "mcp" — CodeSentinel uses its own rule structure.
   */
  engineType: 'web' | 'mcp' | 'recon';

  /**
   * Category grouping for findings produced by this rule.
   * Examples: "security-headers", "broken-links", "schema-rigor".
   */
  category: string;

  /** Default severity for findings produced by this rule. */
  severity: Severity;

  /** Default confidence level for findings produced by this rule. */
  confidence: Confidence;

  /**
   * Evaluate this rule against the provided context.
   * Returns zero or more findings.
   *
   * Rules must:
   * - Not modify the target
   * - Not invoke MCP tools (MCP engine: introspection only)
   * - Not execute discovered code
   * - Respect timeouts
   * - Redact secrets from evidence
   */
  evaluate(context: EngineContext): Finding[] | Promise<Finding[]>;
}

// ---------------------------------------------------------------------------
// Engine Context
// ---------------------------------------------------------------------------

/**
 * Context provided to an EngineRule during evaluation.
 *
 * Each engine provides its own context shape:
 * - Web engine: a Playwright Page + target URL
 * - MCP engine: a tool/resource/prompt manifest + server metadata
 *
 * The context interfaces below are deliberately minimal stubs.
 * The actual implementations (with Playwright Page, MCP SDK types, etc.)
 * will be defined in their respective engine packages and will extend
 * or satisfy these shapes.
 */
export interface EngineContext {
  /** TestRun ID this evaluation belongs to. */
  runId: string;

  /** Which engine is running. */
  engineType: 'web' | 'mcp' | 'recon';

  /** Project ID for finding attribution. */
  projectId: string;

  /** Web engine context — present only when engineType is "web". */
  webContext?: WebContext;

  /** MCP engine context — present only when engineType is "mcp". */
  mcpContext?: McpContext;

  /** Recon engine context — present only when engineType is "recon". */
  reconContext?: ReconContext;
}

// ---------------------------------------------------------------------------
// Engine-Specific Context Stubs
// ---------------------------------------------------------------------------
// These are minimal type stubs. The actual engine packages will import
// and use these as base shapes, extending them with their concrete types
// (Playwright Page, MCP SDK TargetManifest, etc.).

/**
 * Web engine evaluation context.
 * The web-worker package will provide the full implementation
 * with an actual Playwright Page instance.
 */
export interface WebContext {
  /** The target URL being tested. */
  targetUrl: string;

  /**
   * Browser page instance.
   * Typed as `unknown` here to avoid a Playwright dependency in shared.
   * The web-worker package will cast this to Playwright's `Page` type.
   */
  page: unknown;
}

/**
 * MCP engine evaluation context.
 * The mcp-worker package will provide the full implementation
 * with the actual MCP SDK manifest types.
 */
export interface McpContext {
  /** Introspected tool/resource/prompt manifest from the target MCP server. */
  manifest: TargetManifest;

  /** Metadata about the target MCP server (transport, version, etc.). */
  serverMeta: ServerMetadata;
}

// ---------------------------------------------------------------------------
// Recon Context Stubs
// ---------------------------------------------------------------------------
export interface ReconContext {
  target: string;
}

// ---------------------------------------------------------------------------
// MCP Manifest Stubs
// ---------------------------------------------------------------------------
// Minimal type stubs for MCP introspection data. These will be refined
// in Phase 10 (MCP Engine Foundation) when the actual MCP SDK types
// are available.

/** Introspected manifest from an MCP server (tools, resources, prompts). */
export interface TargetManifest {
  /** Tools exposed by the MCP server. */
  tools: McpToolInfo[];

  /** Resources exposed by the MCP server. */
  resources: McpResourceInfo[];

  /** Prompts exposed by the MCP server. */
  prompts: McpPromptInfo[];
}

/** Minimal tool information from MCP introspection. */
export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** Minimal resource information from MCP introspection. */
export interface McpResourceInfo {
  name: string;
  description?: string;
  uri?: string;
}

/** Minimal prompt information from MCP introspection. */
export interface McpPromptInfo {
  name: string;
  description?: string;
}

/** Metadata about an MCP server's transport and configuration. */
export interface ServerMetadata {
  /** Server name as reported by the server. */
  name?: string;

  /** Server version as reported by the server. */
  version?: string;

  /** Transport type used to connect. */
  transport: 'stdio' | 'sse' | 'http';

  /** Whether TLS is in use (relevant for remote servers). */
  tls?: boolean;
}
