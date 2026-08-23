/**
 * CodeSentinel Rules index.
 */

export * from './rule.js';
export * from './engine.js';

import type { CodeRule } from './rule.js';

import { TypeErrorRule } from './detectors/type-errors.js';
import { UnhandledPromiseRule } from './detectors/unhandled-promises.js';
import { UnreachableCodeRule } from './detectors/unreachable-code.js';
import { ApiIntegrationRule } from './detectors/api-integration.js';
import { ContractValidationRule } from './detectors/contract-validation.js';
import { LogicContradictionsRule } from './detectors/logic-contradictions.js';
import { SecretsRule } from './detectors/secrets.js';
import { InjectionRule } from './detectors/injection.js';
import { AuthRule } from './detectors/auth.js';
import { DependencyCveRule } from './detectors/dependency-cve.js';
import { IdorRule } from './detectors/idor.js';

export const ACTIVE_RULES: CodeRule[] = [
  TypeErrorRule,
  UnhandledPromiseRule,
  UnreachableCodeRule,
  ApiIntegrationRule,
  ContractValidationRule,
  LogicContradictionsRule,
  SecretsRule,
  InjectionRule,
  AuthRule,
  DependencyCveRule,
  IdorRule
];
