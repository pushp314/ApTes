/**
 * CodeSentinel configuration.
 *
 * Central configuration for resource limits and scanning behavior.
 * Values are overridable via environment variables per INSTRUCTION.md §15.
 *
 * Configuration must not be scattered throughout the codebase —
 * this is the single source of truth for all limits.
 */

// ---------------------------------------------------------------------------
// Configuration Interface
// ---------------------------------------------------------------------------

export interface CodeSentinelConfig {
  /** Maximum file size in bytes. Files larger than this are skipped. */
  maxFileSize: number;

  /** Maximum number of files to scan. Scanning stops after this limit. */
  maxFiles: number;

  /** File extensions to include in the scan. */
  extensions: string[];

  /** Whether to use content-hash caching (.codesentinel-cache.json). */
  useCache: boolean;

  /** Whether to respect .gitignore patterns. */
  respectGitignore: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default maximum file size: 1 MB */
const DEFAULT_MAX_FILE_SIZE = 1_048_576;

/** Default maximum number of files */
const DEFAULT_MAX_FILES = 10_000;

/** Default file extensions for TypeScript/JavaScript/Python projects */
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cjs', '.cts', '.py'];

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a CodeSentinel configuration with defaults and overrides.
 *
 * Priority: explicit options > environment variables > defaults.
 */
export function createConfig(
  overrides: Partial<CodeSentinelConfig> = {},
): CodeSentinelConfig {
  return {
    maxFileSize:
      overrides.maxFileSize ??
      parseEnvInt('CODESENTINEL_MAX_FILE_SIZE') ??
      DEFAULT_MAX_FILE_SIZE,

    maxFiles:
      overrides.maxFiles ??
      parseEnvInt('CODESENTINEL_MAX_FILES') ??
      DEFAULT_MAX_FILES,

    extensions: overrides.extensions ?? DEFAULT_EXTENSIONS,

    useCache: overrides.useCache ?? true,

    respectGitignore: overrides.respectGitignore ?? true,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEnvInt(key: string): number | undefined {
  const value = process.env[key];
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}
