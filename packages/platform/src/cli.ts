#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from 'commander';
import { runUnifiedPlatform } from './orchestrator.js';
import { CliReporter, JsonReporter, HtmlReporter, MarkdownReporter } from './reporters/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const program = new Command();

program
  .name('sentinel')
  .description('Sentinel Unified Platform Scanner')
  .version('0.1.0');

program
  .command('scan [url]', { isDefault: true })
  .description('Run a scan against a web application target (interactive wizard runs if no arguments are provided)')
  .option('-p, --project <id>', 'Project ID (defaults to auto-generated)')
  .option('-m, --mcp <command>', 'MCP server command to run (e.g. "node server.js")')
  .option('-y, --authorized', 'Confirm that you own or have written permission to test the targets')
  .option('--mcp-name <name>', 'Stable MCP target name for explicit Web ↔ MCP correlation')
  .option('--allow-local', 'Allow localhost/private web targets', false)
  .option('-c, --code <path>', 'Source code directory for backend analysis')
  .option('-A, --ai', 'Enable AI analysis for low confidence findings', false)
  .option('--budget <number>', 'Maximum number of AI requests per scan', '5')
  .option('--ai-model <model>', 'Ollama model to use', 'llama3')
  .option('--ai-provider <provider>', 'AI provider to use (ollama, mock)', 'ollama')
  .option('--ai-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('-f, --format <format>', 'Output format: cli, json, html, md', 'cli')
  .option('-o, --out <file>', 'Output file path')
  .option('-E, --executive-report <dir>', 'Generate a VC-friendly AI Executive Report in the specified directory')
  .option('-x, --exclude <globs>', 'Comma-separated glob patterns to exclude (e.g. "fixtures/**,tests/**")')
  .option('-S, --skip-type-errors', 'Suppress TypeScript type diagnostics (useful for JS-only projects)', false)
  .action(async (url, options) => {
    // If running `sentinel scan` with NO arguments, launch the interactive wizard
    const hasArgs = process.argv.length > 3;
    let projectConfig;

    if (!hasArgs) {
      const { runInteractiveWizard } = await import('./wizard.js');
      projectConfig = await runInteractiveWizard();
    } else {
      if (!url || !options.mcp || !options.authorized) {
        console.error('Error: missing required arguments. Run `sentinel scan --help` or run `sentinel scan` without arguments for the interactive wizard.');
        console.error('Usage: sentinel scan <url> -m <mcp_command> -y');
        process.exit(1);
      }
      const [cmd, ...args] = options.mcp.split(' ');
      projectConfig = {
        id: options.project || `sentinel-${Date.now()}`,
        webUrl: url,
        authorizationConfirmed: options.authorized,
        authorizationConfirmedAt: new Date().toISOString(),
        codePath: options.code,
        excludePatterns: options.exclude ? options.exclude.split(',').map((s: string) => s.trim()) : [],
        skipTypeErrors: options.skipTypeErrors || false,
        allowLocalTargets: options.allowLocal,
        aiEnabled: options.ai,
        aiBudget: parseInt(options.budget, 10),
        aiModel: options.aiModel,
        aiUrl: options.aiUrl,
        aiProvider: options.aiProvider,
        mcpTargets: [
          {
            name: options.mcpName,
            command: cmd,
            args: args || [],
            authorizationConfirmed: options.authorized,
            authorizationConfirmedAt: new Date().toISOString(),
          }
        ]
      };
    }

    try {
      console.log(`Starting Sentinel Platform Scan for project: ${projectConfig.id}`);
      const report = await runUnifiedPlatform(projectConfig as any, 30000);

      let reporter;
      switch (options.format) {
        case 'json': reporter = new JsonReporter(); break;
        case 'html': reporter = new HtmlReporter(); break;
        case 'md': reporter = new MarkdownReporter(); break;
        case 'cli': 
        default: reporter = new CliReporter(); break;
      }

      const output = reporter.generate(report);

      if (options.out) {
        await fs.writeFile(path.resolve(options.out), output, 'utf-8');
        console.log(`Report written to ${options.out}`);
      } else {
        console.log('\n' + output);
      }

      if (options.executiveReport) {
        const { generateExecutiveReport } = await import('./reporters/index.js');
        const reportPath = await generateExecutiveReport(report.findings, options.executiveReport, options.aiModel);
        console.log(`\n[Sentinel AI] Executive HTML report generated at: ${reportPath}`);
      }

      if (report.errors.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error('Fatal error during platform scan:', err);
      process.exit(1);
    }
  });

program
  .command('run <configFile>')
  .description('Run a scan using a JSON configuration file')
  .option('--format <format>', 'Output format: cli, json, html, md', 'cli')
  .option('--out <file>', 'Output file path (optional)')
  .action(async (configFile, options) => {
    try {
      const configStr = await fs.readFile(path.resolve(configFile), 'utf-8');
      const project = JSON.parse(configStr);

      console.log(`Starting Sentinel Platform Scan from config: ${configFile}`);
      const report = await runUnifiedPlatform(project, 30000);

      let reporter;
      switch (options.format) {
        case 'json': reporter = new JsonReporter(); break;
        case 'html': reporter = new HtmlReporter(); break;
        case 'md': reporter = new MarkdownReporter(); break;
        case 'cli': 
        default: reporter = new CliReporter(); break;
      }

      const output = reporter.generate(report);

      if (options.out) {
        await fs.writeFile(path.resolve(options.out), output, 'utf-8');
        console.log(`Report written to ${options.out}`);
      } else {
        console.log('\n' + output);
      }

      if (report.errors.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error('Fatal error during config run:', err);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Generate a sentinel.config.json interactively')
  .action(async () => {
    try {
      const { runInteractiveWizard } = await import('./wizard.js');
      await runInteractiveWizard();
      console.log('Use `sentinel run sentinel.config.json` to start scanning.');
    } catch (err) {
      console.error('Fatal error during init:', err);
      process.exit(1);
    }
  });

program.parse(process.argv);
