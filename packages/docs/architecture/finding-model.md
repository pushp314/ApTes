# Finding Model

The `Finding` is the universal data structure that every engine in Sentinel outputs. It is defined in `@sentinel/shared` and represents a single discovered vulnerability, misconfiguration, or security concern.

## The Finding Interface

```typescript
interface Finding {
  id: string;              // Unique identifier (UUID v4)
  engine: string;          // 'code' | 'web' | 'mcp' | 'platform'
  ruleId: string;          // The rule that generated this finding
  category: string;        // e.g., 'injection', 'auth', 'config'
  title: string;           // Human-readable title
  message: string;         // Detailed explanation
  severity: Severity;      // CRITICAL | HIGH | MEDIUM | LOW | INFO
  confidence: Confidence;  // HIGH | MEDIUM | LOW
  location: string;        // File path, URL, or tool name
  evidence?: string;       // Code snippet or network data
  fix?: string;            // Remediation guidance

  // AI Assessment (appended by AI Reviewer)
  aiAssessment?: AiAssessment;
}
```

## Severity Levels

| Level | Description | Example |
| --- | --- | --- |
| `CRITICAL` | Immediate exploitable vulnerability | Command injection, hardcoded production secrets |
| `HIGH` | Serious vulnerability requiring prompt fix | SQL injection, missing authentication |
| `MEDIUM` | Moderate risk, should be fixed | Logic contradictions, unhandled promises |
| `LOW` | Minor issue or informational | Unreachable code, console errors |
| `INFO` | Informational, no direct risk | Tool classifications, metadata |

## Confidence Levels

| Level | Description | AI Triage |
| --- | --- | --- |
| `HIGH` | Deterministically confirmed (no ambiguity) | ❌ Skipped (unnecessary) |
| `MEDIUM` | Heuristic match, likely true positive | ✅ Sent to AI |
| `LOW` | Pattern match, may be false positive | ✅ Sent to AI |

## Unified Report

The final output of a Sentinel scan is the `UnifiedReport`:

```typescript
interface UnifiedReport {
  projectId: string;
  score: number;           // 0-100 security score
  findings: Finding[];     // All findings from all engines
  engineTimings: {
    code?: number;
    web?: number;
    mcp?: number;
  };
  totalTimeMs: number;
}
```
