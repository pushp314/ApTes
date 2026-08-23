#!/usr/bin/env node

import { Command } from 'commander';
import { runWebEngine } from './runner.js';
import { ConsoleErrorsRule } from './rules/console-errors.js';
import { FailedRequestsRule } from './rules/failed-requests.js';
import { FormsRule } from './rules/forms.js';
import { PageStructureRule } from './rules/page-structure.js';
import { PerformanceRule } from './rules/performance.js';
import { SecurityHeadersRule } from './rules/security-headers.js';
import { CookieSecurityRule } from './rules/cookie-security.js';
import { MixedContentRule } from './rules/mixed-content.js';
import * as fs from 'node:fs';

const program = new Command();

program
  .name('web-engine')
  .description('Sentinel Web Engine CLI (for local testing and debugging)')
  .version('0.1.0');

program
  .command('scan <url>')
  .description('Scan a target URL using the Web Engine')
  .requiredOption('--i-own-this-target', 'Confirm that you own or have written permission to test this target')
  .option('--allow-local', 'Allow scanning localhost / private IPs (for testing ONLY)')
  .option('--timeout <ms>', 'Timeout for the scan per page in milliseconds', '30000')
  .option('--max-pages <n>', 'Maximum number of pages to crawl', '1')
  .option('--export <path>', 'Export findings to a JSON file')
  .action(async (url: string, options: { iOwnThisTarget: boolean; allowLocal: boolean; timeout: string; maxPages: string; export?: string }) => {
    // eslint-disable-next-line no-console
    console.log(`Starting Web Engine scan for: ${url}`);
    
    // Phase 9, 10, & 11 rules
    const rules = [
      ConsoleErrorsRule, 
      FailedRequestsRule, 
      FormsRule, 
      PageStructureRule, 
      PerformanceRule,
      SecurityHeadersRule,
      CookieSecurityRule,
      MixedContentRule
    ];

    const result = await runWebEngine(
      url, 
      rules, 
      'local-test-project', 
      {
        allowLocal: options.allowLocal,
        authorizationConfirmed: options.iOwnThisTarget,
        authorizationConfirmedAt: new Date().toISOString(),
        scanTimeoutMs: parseInt(options.timeout, 10),
        maxPages: parseInt(options.maxPages, 10),
      }
    );

    if (result.error) {
      // eslint-disable-next-line no-console
      console.error(`\n[!] Scan failed with error: ${result.error}`);
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(`\nScan completed in ${result.durationMs}ms`);
    // eslint-disable-next-line no-console
    console.log(`Pages Scanned: ${result.pagesScanned}`);
    // eslint-disable-next-line no-console
    console.log(`Found ${result.findings.length} findings.\n`);

    for (const finding of result.findings) {
      // eslint-disable-next-line no-console
      console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
      // eslint-disable-next-line no-console
      console.log(`  Rule: ${finding.ruleId}`);
      // eslint-disable-next-line no-console
      console.log(`  Location: ${finding.location}`);
      // eslint-disable-next-line no-console
      console.log(`  Message: ${finding.message}\n`);
    }

    if (options.export) {
      fs.writeFileSync(options.export, JSON.stringify(result.findings, null, 2));
      // eslint-disable-next-line no-console
      console.log(`Findings exported to ${options.export}`);
    }
  });

program.parse(process.argv);
