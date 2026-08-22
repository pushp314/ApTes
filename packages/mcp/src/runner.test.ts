import { describe, it, expect } from 'vitest';
import { runMcpEngine } from './runner.js';
import { ToolCountRule } from './rules/test-rule.js';
import { SchemaRigorRule } from './rules/schema-rigor.js';
import { PrivilegeAnalysisRule } from './rules/privilege-analysis.js';
import { TransportSecurityRule } from './rules/transport-security.js';
import { CveMatchingRule } from './rules/cve-matching.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MCP Engine Runner', () => {
  it('connects to a local MCP server, parses the manifest, and executes rules', async () => {
    // Start the dummy server via node
    const testServerPath = path.join(__dirname, 'test-server.js');
    
    const rules = [ToolCountRule, SchemaRigorRule, PrivilegeAnalysisRule, TransportSecurityRule, CveMatchingRule];

    const result = await runMcpEngine(rules, 'test-project', {
      command: 'node',
      args: [testServerPath],
      scanTimeoutMs: 15000,
    });

    // Verify it succeeded
    expect(result.error).toBeUndefined();
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.findings.length).toBeGreaterThan(0);

    const toolFinding = result.findings.find(f => f.ruleId === 'mcp-tool-count');
    expect(toolFinding).toBeDefined();
    
    // Verify it introspected the exact dummy server contents (8 tools now)
    expect(toolFinding?.message).toContain('exposes 8 tools');
    expect(toolFinding?.evidence?.toolNames).toContain('safe_read_file');

    // Schema Rigor checks
    const schemaFindings = result.findings.filter(f => f.ruleId === 'mcp-schema-rigor');
    expect(schemaFindings.some(f => f.title.includes('Opaque Object Schema') && f.location?.includes('save_file'))).toBe(true);
    expect(schemaFindings.some(f => f.title.includes('Unbounded String Parameter: sql') && f.location?.includes('execute_query'))).toBe(true);

    // Privilege Analysis checks
    const privilegeFindings = result.findings.filter(f => f.ruleId === 'mcp-privilege-analysis');
    expect(privilegeFindings.some(f => f.title.includes('Dangerous Capability with Unbounded Inputs: execute_query'))).toBe(true);
    
    // FS Scope analysis checks
    expect(privilegeFindings.some(f => f.title.includes('Unscoped Filesystem Access: unsafe_read_file'))).toBe(true);
    expect(privilegeFindings.some(f => f.title.includes('Scoped Filesystem Access: safe_read_file'))).toBe(true);

    // Network Scope analysis checks
    expect(privilegeFindings.some(f => f.title.includes('Unscoped Network Access: unsafe_fetch'))).toBe(true);
    expect(privilegeFindings.some(f => f.title.includes('Scoped Network Access: safe_fetch'))).toBe(true);

    // CVE Matching check
    const cveFindings = result.findings.filter(f => f.ruleId === 'mcp-cve-matching');
    expect(cveFindings.length).toBeGreaterThan(0);
    expect(cveFindings.some(f => f.title.includes('SENTINEL-CVE-2024-001'))).toBe(true);
  }, 20000);

  it('fails safely when the server does not exist', async () => {
    const rules = [ToolCountRule];
    const result = await runMcpEngine(rules, 'test-project', {
      command: 'node',
      args: ['does-not-exist.js'],
      scanTimeoutMs: 5000,
    });

    expect(result.error).toBeDefined();
    expect(result.findings).toHaveLength(0);
  });
});
