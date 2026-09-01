import { describe, it, expect } from 'vitest';
import { NmapAdapter } from './nmap.js';

describe('NmapAdapter', () => {
  it('parses nmap XML output correctly using regex', () => {
    const stdout = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -sV -oX - example.com" start="1690000000">
<host starttime="1690000000" endtime="1690000005">
<status state="up" reason="user-set" reason_ttl="0"/>
<address addr="192.168.1.100" addrtype="ipv4"/>
<hostnames>
<hostname name="example.com" type="user"/>
</hostnames>
<ports>
<port protocol="tcp" portid="22">
  <state state="open" reason="syn-ack" reason_ttl="0"/>
  <service name="ssh" product="OpenSSH" version="8.2p1 Ubuntu 4ubuntu0.5" extrainfo="Ubuntu Linux; protocol 2.0" ostype="Linux" method="probed" conf="10"/>
</port>
<port protocol="tcp" portid="80">
  <state state="closed" reason="conn-refused" reason_ttl="0"/>
  <service name="http" method="table" conf="3"/>
</port>
<port protocol="tcp" portid="6379">
  <state state="open" reason="syn-ack" reason_ttl="0"/>
  <service name="redis" product="Redis key-value store" version="6.0.16" method="probed" conf="10"/>
</port>
</ports>
</host>
</nmaprun>
    `.trim();

    const findings = NmapAdapter.parse({
      stdout,
      stderr: '',
      exitCode: 0,
      durationMs: 5000
    }, 'test-project', 'test-run');

    // Should only find the 2 OPEN ports (22, 6379), ignoring 80 (closed)
    expect(findings.length).toBe(2);
    
    const sshFinding = findings.find(f => f.ruleId === 'recon-nmap-port-22');
    expect(sshFinding).toBeDefined();
    expect(sshFinding!.severity).toBe('info');
    expect((sshFinding!.evidence as any).service).toBe('ssh');
    expect((sshFinding!.evidence as any).version).toBe('8.2p1 Ubuntu 4ubuntu0.5');

    const redisFinding = findings.find(f => f.ruleId === 'recon-nmap-port-6379');
    expect(redisFinding).toBeDefined();
    expect(redisFinding!.severity).toBe('high'); // 6379 is high severity
    expect((redisFinding!.evidence as any).service).toBe('redis');
  });

  it('handles output with no open ports safely', () => {
    const stdout = `
<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap">
<host>
<ports>
<port protocol="tcp" portid="80">
  <state state="filtered" reason="no-response"/>
</port>
</ports>
</host>
</nmaprun>
    `.trim();

    const findings = NmapAdapter.parse({
      stdout,
      stderr: '',
      exitCode: 0,
      durationMs: 100
    }, 'test-project', 'test-run');

    expect(findings.length).toBe(0);
  });
});
