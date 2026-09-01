import { randomUUID } from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { ToolAdapter, ToolRunOptions, RawToolOutput } from '../adapter.js';

export const NmapAdapter: ToolAdapter = {
  id: 'nmap',
  name: 'Nmap',

  async checkAvailable(): Promise<boolean> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    try {
      await execFileAsync('nmap', ['-V']);
      return true;
    } catch {
      return false;
    }
  },

  async run(target: string, options: ToolRunOptions): Promise<RawToolOutput> {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    const start = Date.now();
    try {
      // Standard scan: Service version detection (-sV), output XML to stdout (-oX -)
      const args = ['-sV', '-oX', '-', target];
      if (options.extraArgs) {
        args.push(...options.extraArgs);
      }
      const { stdout, stderr } = await execFileAsync('nmap', args, { timeout: options.timeoutMs });
      return {
        stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - start
      };
    } catch (e: any) {
      return {
        stdout: e.stdout || '',
        stderr: e.stderr || e.message,
        exitCode: e.code || 1,
        durationMs: Date.now() - start
      };
    }
  },

  parse(raw: RawToolOutput, projectId: string, runId: string): Finding[] {
    const findings: Finding[] = [];
    if (!raw.stdout) return findings;

    // We avoid pulling in a full XML parser dependency by doing naive regex extraction on the nmap XML shape.
    // Nmap XML structure for open ports:
    // <port protocol="tcp" portid="80">
    //   <state state="open" reason="syn-ack" reason_ttl="0"/>
    //   <service name="http" product="nginx" version="1.18.0" method="probed" conf="10"/>
    // </port>
    
    const portRegex = /<port protocol="([^"]+)" portid="([^"]+)">\s*<state state="([^"]+)"[^>]*>\s*(?:<service name="([^"]+)"(?: product="([^"]*)")?(?: version="([^"]*)")?[^>]*>\s*)?<\/port>/gi;
    let match;

    while ((match = portRegex.exec(raw.stdout)) !== null) {
      const [_, protocol, portId, state, serviceName, product, version] = match;

      if (!protocol || !portId || state !== 'open') continue;

      const portNumber = parseInt(portId, 10);
      let severity: Finding['severity'] = 'info';
      
      // Determine severity based on port and service
      // High severity for unencrypted protocols or commonly exploited unauth services if exposed directly
      const highSeverityPorts = [21, 23, 111, 445, 1433, 3306, 6379, 11211, 27017];
      if (highSeverityPorts.includes(portNumber)) {
        severity = 'high';
      } else if (serviceName && ['telnet', 'ftp', 'ms-sql-s', 'mysql', 'redis', 'memcache', 'mongodb'].includes(serviceName.toLowerCase())) {
        severity = 'high';
      }

      let evidenceDesc = `${protocol.toUpperCase()} port ${portId} is open.`;
      if (serviceName) evidenceDesc += ` Service: ${serviceName}`;
      if (product) evidenceDesc += ` Product: ${product}`;
      if (version) evidenceDesc += ` Version: ${version}`;

      findings.push({
        id: randomUUID(),
        projectId,
        runId,
        engine: 'recon',
        ruleId: `recon-nmap-port-${portId}`,
        category: 'network-exposure',
        severity,
        confidence: 'high',
        title: `Exposed Service on Port ${portId}`,
        message: `An open port was detected running an exposed service.`,
        evidence: {
          port: portNumber,
          protocol,
          service: serviceName || 'unknown',
          product: product || '',
          version: version || '',
          raw: evidenceDesc
        },
        remediation: 'Ensure this service is intended to be publicly exposed. Use a firewall or security group to restrict access to trusted IPs if this is an internal service.',
        timestamp: new Date().toISOString()
      });
    }

    return findings;
  }
};
