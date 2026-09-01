# Sentinel Documentation Audit

## Overview
This document evaluates the state of the project's documentation against the actual implementation. It identifies contradictions, outdated information, and missing files based on the formal Pre-Real-World Verification Audit.

## 1. Missing or Misnamed Documents
| Document | Expected Status | Actual Status | Classification |
|----------|-----------------|---------------|----------------|
| `ARCHITECTURE.md` | Required by master prompts | Missing | MISSING (Exists as `Sentinel_Combined_Architecture_Spec.md`) |
| `ROADMAP.md` | Required by master prompts | Missing | MISSING (Exists as `SENTINEL_ROADMAP.md`) |

## 2. Inconsistencies & Drift
### Engine Type Tagging
- `INSTRUCTION.md` (Section 8): Defines `engine` in the `Finding` interface.
- `Sentinel_Combined_Architecture_Spec.md` (Section 6): Mentions `engineType`.
- **Implementation:** The TypeScript interface strictly uses `engine`. 
- **Classification:** CONTRADICTORY. The architecture spec should be updated to align with `INSTRUCTION.md`.

### Phase 8 & 9 (Discovery Bridge & Code Import)
- `Sentinel_Combined_Architecture_Spec.md` explicitly defers Automatic MCP Discovery and Code ↔ Web drift correlation to Post-MVP.
- **Implementation:** Correctly omits these features in the MVP.
- **Classification:** CORRECT.

### AI Assist Layer
- `AI.md` was requested in previous instructions but was implemented as `AI_ASSIST.md`.
- **Classification:** OUTDATED (File naming inconsistency).

## 3. Recommended Actions
1. **Rename** `Sentinel_Combined_Architecture_Spec.md` to `ARCHITECTURE.md`.
2. **Rename** `SENTINEL_ROADMAP.md` to `ROADMAP.md`.
3. Update the architecture spec to fix the `engineType` vs `engine` typo in the `Finding` schema.
4. Delete duplicate spec file `Sentinel_Combined_Architecture_Spec (1).md`.
