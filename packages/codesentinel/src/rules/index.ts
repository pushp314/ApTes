/**
 * CodeSentinel Rules index.
 */

export * from './rule.js';
export * from './engine.js';

import { TypeErrorRule } from './detectors/type-errors.js';
import { UnhandledPromiseRule } from './detectors/unhandled-promises.js';
import { UnreachableCodeRule } from './detectors/unreachable-code.js';

export const ACTIVE_RULES = [
  TypeErrorRule,
  UnhandledPromiseRule,
  UnreachableCodeRule,
];
