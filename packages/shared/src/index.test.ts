import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('@sentinel/shared', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0');
    expect(typeof VERSION).toBe('string');
  });
});
