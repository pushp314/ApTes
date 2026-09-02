/**
 * @sentinel/shared
 *
 * Shared contracts, interfaces, and utilities for the Sentinel platform.
 *
 * This package defines the stable contracts that all engines depend on:
 * - Finding interface (shared output format for all engines)
 * - EngineRule interface (shared rule interface for Web and MCP engines)
 * - Core types (Severity, Confidence, EngineType)
 *
 * These contracts allow the engines to remain architecturally independent
 * while producing compatible output for unified reporting and correlation.
 */

// Core types and runtime validators
export {
  type Severity,
  type Confidence,
  type EngineType,
  SEVERITIES,
  CONFIDENCES,
  ENGINE_TYPES,
  isSeverity,
  isConfidence,
  isEngineType,
} from "./types.js";

export * from "./logger.js";

// Finding interface (shared data contract)
export {
  type Finding,
  type AiAssessment,
  type FindingNarrative,
  type AuditChapter,
} from "./finding.js";

// Engine rule interfaces (Web + MCP execution contract)
export {
  type EngineRule,
  type EngineContext,
  type WebContext,
  type McpContext,
  type TargetManifest,
  type McpToolInfo,
  type McpResourceInfo,
  type McpPromptInfo,
  type ServerMetadata,
} from "./engine-rule.js";

/** Sentinel platform version */
export const VERSION = "0.1.0";
