import { describe, it, expect } from 'vitest';
import { validateTarget, SecurityError } from './security.js';

describe('Web Engine SSRF Protection', () => {
  it('allows public domains', async () => {
    // We mock dns lookup in real tests, but for now we'll just test a known public domain
    // Google DNS IP is usually public.
    await expect(validateTarget('https://example.com')).resolves.toBeUndefined();
  });

  it('blocks localhost directly', async () => {
    await expect(validateTarget('http://localhost:8080')).rejects.toThrow(SecurityError);
    await expect(validateTarget('http://127.0.0.1')).rejects.toThrow(SecurityError);
  });

  it('blocks cloud metadata IP', async () => {
    await expect(validateTarget('http://169.254.169.254/latest/meta-data')).rejects.toThrow(SecurityError);
  });

  it('allows localhost if allowLocal is explicitly true', async () => {
    await expect(validateTarget('http://localhost:8080', true)).resolves.toBeUndefined();
  });

  it('rejects unsupported protocols', async () => {
    await expect(validateTarget('file:///etc/passwd')).rejects.toThrow(SecurityError);
    await expect(validateTarget('ftp://example.com')).rejects.toThrow(SecurityError);
  });
});
