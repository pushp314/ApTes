export class SecretRedactor {
  private readonly rules: { name: string; pattern: RegExp }[] = [
    // Matches generic API keys/tokens (sk-...)
    { name: 'API_KEY', pattern: /\b(sk_live_[0-9a-zA-Z]+|sk_test_[0-9a-zA-Z]+|sk-[a-zA-Z0-9]{20,})\b/g },
    // Matches Bearer tokens
    { name: 'BEARER_TOKEN', pattern: /Bearer\s+[A-Za-z0-9-._~+/]+=*/g },
    // Matches Passwords in URLs (http://user:password@)
    { name: 'URL_AUTH', pattern: /(?<=:\/\/)[^:]+:[^@]+@/g },
    // Matches potential AWS keys
    { name: 'AWS_KEY', pattern: /(AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g }
  ];

  public redact(text: string): string {
    if (!text) return text;

    let redactedText = text;
    for (const rule of this.rules) {
      redactedText = redactedText.replace(rule.pattern, `[REDACTED_${rule.name}]`);
    }

    return redactedText;
  }

  public redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.redact(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const redacted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        redacted[key] = this.redactObject(value);
      }
      return redacted as unknown as T;
    }

    return obj;
  }
}
