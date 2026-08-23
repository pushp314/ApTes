import { describe, it, expect } from 'vitest';
import { SecretRedactor } from './ai/redactor.js';

describe('SecretRedactor', () => {
  const redactor = new SecretRedactor();

  it('redacts generic API keys', () => {
    const text = 'Here is my key: sk_live_ABC123abcDEF456xyz789';
    expect(redactor.redact(text)).toBe('Here is my key: [REDACTED_API_KEY]');
  });

  it('redacts bearer tokens', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ';
    expect(redactor.redact(text)).toBe('Authorization: [REDACTED_BEARER_TOKEN]');
  });

  it('redacts nested objects', () => {
    const obj = {
      message: 'Failed to connect',
      details: {
        url: 'https://user:SuperSecretPassword123@api.example.com/v1/data',
        auth: 'Bearer 1234567890'
      }
    };

    const result = redactor.redactObject(obj) as Record<string, any>;
    expect(result.details.url).toBe('https://[REDACTED_URL_AUTH]api.example.com/v1/data');
    expect(result.details.auth).toBe('[REDACTED_BEARER_TOKEN]');
  });
});
