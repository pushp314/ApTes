/**
 * Core type definitions for the Sentinel platform.
 *
 * These are the foundational types shared across all three engines
 * (Web, MCP, Code). They define the vocabulary used by the Finding
 * interface, EngineRule interface, and all reporting/correlation logic.
 */

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/**
 * Finding severity levels, ordered from most to least severe.
 *
 * - critical: Immediate, exploitable security vulnerability or data loss risk.
 * - high:     Significant security or reliability issue requiring prompt action.
 * - medium:   Notable issue that should be addressed but is not immediately dangerous.
 * - low:      Minor issue or improvement opportunity.
 * - info:     Informational observation, no action required.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** All valid severity values, ordered most to least severe. Useful for runtime validation. */
export const SEVERITIES: readonly Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
] as const;

/** Returns true if the given string is a valid Severity value. */
export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

/**
 * Finding confidence level.
 *
 * - high: The engine is confident this is a real issue (deterministic detection).
 * - low:  The engine suspects an issue but cannot prove it with certainty.
 *         Low-confidence findings are the only category eligible for optional
 *         AI-assisted triage (when AI is explicitly enabled).
 */
export type Confidence = 'high' | 'low';

/** All valid confidence values. */
export const CONFIDENCES: readonly Confidence[] = ['high', 'low'] as const;

/** Returns true if the given string is a valid Confidence value. */
export function isConfidence(value: string): value is Confidence {
  return (CONFIDENCES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Engine Type
// ---------------------------------------------------------------------------

/**
 * Identifies which engine produced a finding.
 *
 * - web:  Web Engine — tests deployed web applications (requires authorization).
 * - mcp:  MCP Engine — analyzes MCP servers via introspection (requires authorization).
 * - code: Code Engine (CodeSentinel) — local source-code analysis (no authorization needed).
 */
export type EngineType = 'web' | 'mcp' | 'code' | 'platform';

/** All valid engine type values. */
export const ENGINE_TYPES: readonly EngineType[] = [
  'web',
  'mcp',
  'code',
  'platform',
] as const;

/** Returns true if the given string is a valid EngineType value. */
export function isEngineType(value: string): value is EngineType {
  return (ENGINE_TYPES as readonly string[]).includes(value);
}
