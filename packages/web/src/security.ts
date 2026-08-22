/**
 * Security: SSRF Protection
 *
 * Provides mandatory URL and IP validation for the Web Engine to prevent
 * Server-Side Request Forgery (SSRF) and restrict scanning to public assets.
 *
 * Blocks:
 * - localhost / 127.0.0.1
 * - RFC 1918 Private IP ranges (10.x, 172.16.x, 192.168.x)
 * - Cloud Metadata services (169.254.x.x)
 */

import * as dns from 'node:dns/promises';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validates a target URL.
 * 
 * @param urlString - The URL to validate.
 * @param allowLocal - If true, bypasses SSRF checks (for local testing ONLY).
 * @throws {SecurityError} If the URL is invalid or points to a restricted IP.
 */
export async function validateTarget(urlString: string, allowLocal = false): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new SecurityError(`Invalid URL format: ${urlString}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SecurityError(`Unsupported protocol: ${url.protocol}. Only http and https are allowed.`);
  }

  if (allowLocal) {
    return; // Bypass IP checks for local fixtures/testing
  }

  const hostname = url.hostname;
  
  // Quick structural check
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    throw new SecurityError('Targetting localhost is prohibited by SSRF protection.');
  }

  // Resolve hostname to IP to prevent DNS rebinding or obfuscated IPs
  let addresses: string[] = [];
  try {
    const lookup = await dns.lookup(hostname, { all: true, family: 4 });
    addresses = lookup.map(l => l.address);
  } catch {
    // If we can't resolve it, we can't scan it safely
    throw new SecurityError(`Could not resolve hostname: ${hostname}`);
  }

  for (const ip of addresses) {
    if (isRestrictedIp(ip)) {
      throw new SecurityError(`Target resolves to restricted IP: ${ip}`);
    }
  }
}

/**
 * Checks if an IPv4 address is restricted (private/local/metadata).
 */
function isRestrictedIp(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false; // Not a valid IPv4, let caller or playwright fail
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 169 && b === 254) return true;

  return false;
}
