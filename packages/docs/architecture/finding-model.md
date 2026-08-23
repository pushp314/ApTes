# Shared Finding Model

The `Finding` interface defined in `packages/shared/src/finding.ts` is the authoritative contract for all vulnerabilities detected by Sentinel.

## Finding Interface

```typescript
export interface Finding {
  engine: 'web' | 'mcp' | 'code' | 'platform';
  ruleId: string;
  category: 'security' | 'logic-error' | 'contract-mismatch' | 'api-integration' | 'other';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  message: string;
  evidence?: string;
  remediation?: string;
  timestamp: string;
  aiAssessment?: {
    isTruePositive: boolean;
    confidenceScore: number;
    explanation: string;
    patch?: string;
  };
}
```

### Field Definitions

| Field | Type | Description |
| --- | --- | --- |
| `engine` | `enum` | **Required.** The engine that produced the finding (NOT `engineType`). |
| `ruleId` | `string` | **Required.** The ID of the rule that was triggered (e.g., `injection-risk`). |
| `category` | `enum` | **Required.** Broad categorization of the vulnerability. |
| `severity` | `enum` | **Required.** Deterministic severity rating. |
| `confidence` | `enum` | **Required.** Determines if AI triage is necessary (LOW/MEDIUM are triaged). |
| `location` | `string` | **Required.** File path, line number, tool name, or URL. |
| `message` | `string` | **Required.** Human-readable explanation of the issue. |
| `evidence` | `string` | *Optional.* Code snippet, headers, or JSON dump proving the issue. |
| `remediation` | `string` | *Optional.* Deterministic instruction to fix the issue. |
| `timestamp` | `string` | **Required.** ISO 8601 string of when the finding was generated. |
| `aiAssessment`| `object` | *Optional.* Only populated if AI Assist is enabled and triaged this finding. |
