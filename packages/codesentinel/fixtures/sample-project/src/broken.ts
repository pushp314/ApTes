// 1. Unhandled promise
export function doBackgroundWork() {
  // Returns a promise, not awaited or caught
  Promise.resolve('done');
}

// 2. Type error & missing symbol
export function calculate() {
  const a: number = 'string'; // Type error
  return nonExistentVariable; // Missing symbol
}

// 3. Null/undefined risk
export function getLength(str: string | undefined) {
  return str.length; // Risk: Object is possibly 'undefined'
}

// 4. Unreachable code
export function determineValue() {
  return 42;
  const x = 1; // Unreachable
}

// 5. Broken import
import { somethingMissing } from './utils'; // This doesn't exist in utils.ts
