import { Command } from 'commander';
import { runMcpEngine } from './runner.js';
import { ToolCountRule } from './rules/test-rule.js';
import { SchemaRigorRule } from './rules/schema-rigor.js';
import { PrivilegeAnalysisRule } from './rules/privilege-analysis.js';
import { TransportSecurityRule } from './rules/transport-security.js';
import { CveMatchingRule } from './rules/cve-matching.js';
import * as fs from 'node:fs';

const program = new Command();

program
  .name('mcp-engine')
  .description('Sentinel MCP Engine CLI (for local testing and debugging)')
  .version('0.1.0');

program
  .command('scan <command> [args...]')
  .description('Scan a target MCP server by spawning it as a subprocess (stdio)')
  .requiredOption('--i-own-this-target', 'Confirm that you own or have written permission to test this MCP target')
  .option('--timeout <ms>', 'Timeout for the scan in milliseconds', '30000')
  .option('--export <path>', 'Export findings to a JSON file')
  .action(async (command: string, args: string[], options: { iOwnThisTarget: boolean; timeout: string; export?: string }) => {
    // eslint-disable-next-line no-console
    console.log(`Starting MCP Engine scan for command: ${command} ${args.join(' ')}`);
    
    const rules = [
      ToolCountRule,
      SchemaRigorRule,
      PrivilegeAnalysisRule,
      TransportSecurityRule,
      CveMatchingRule
    ];

    const result = await runMcpEngine(
      rules,
      'test-project',
      {
        command,
        args,
        authorizationConfirmed: options.iOwnThisTarget,
        authorizationConfirmedAt: new Date().toISOString(),
        scanTimeoutMs: parseInt(options.timeout, 10),
      }
    );

    if (result.error) {
      // eslint-disable-next-line no-console
      console.error(`\n[!] Scan failed: ${result.error}`);
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(`\nScan completed in ${result.durationMs}ms`);
    // eslint-disable-next-line no-console
    console.log(`Total Findings: ${result.findings.length}\n`);

    for (const finding of result.findings) {
      // eslint-disable-next-line no-console
      console.log(`[${finding.severity.toUpperCase()}] ${finding.ruleId}`);
      // eslint-disable-next-line no-console
      console.log(`  Title: ${finding.title}`);
      // eslint-disable-next-line no-console
      console.log(`  Message: ${finding.message}\n`);
    }

    if (options.export) {
      fs.writeFileSync(options.export, JSON.stringify(result, null, 2));
      // eslint-disable-next-line no-console
      console.log(`Exported findings to ${options.export}`);
    }
  });

program.parse(process.argv);
