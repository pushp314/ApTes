/**
 * @sentinel/codesentinel
 *
 * Local source-code analysis tool.
 * Detects bugs, API mismatches, logic errors, and cross-file inconsistencies
 * in TypeScript/JavaScript projects.
 *
 * This is the public API entry point for programmatic usage.
 * For CLI usage, see cli.ts.
 */

export { createConfig, type CodeSentinelConfig } from './config.js';
export { walkProject, type WalkedFile, type WalkResult } from './walker.js';
export { ContentHashCache, computeHash } from './cache.js';
export { parseFiles, type ParseResult, type ParseError } from './parser.js';
export { scan, type ScanResult } from './scanner.js';
export { LocalAiReviewer, type LocalAiReviewerOptions } from './ai-reviewer.js';
