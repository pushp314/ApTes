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
  .command('scan', { isDefault: true })
  .description('Run a scan via CLI arguments')
  .requiredOption('--project <id>', 'Project ID')
  .requiredOption('--web <url>', 'Web application URL to scan')
  .requiredOption('--mcp <command>', 'MCP server command to run (e.g. "node server.js")')
  .option('--ai', 'Enable AI analysis for low confidence findings', false)
  .option('--budget <number>', 'Maximum number of AI requests per scan', '5')
  .option('--ai-model <model>', 'Ollama model to use', 'llama3')
  .option('--ai-url <url>', 'Ollama API URL', 'http://localhost:11434')
  .option('--format <format>', 'Output format: cli, json, html, md', 'cli')
  .option('--out <file>', 'Output file path (optional)')
  .action(async (options) => {
    try {
      const [cmd, ...args] = options.mcp.split(' ');

      const project = {
        id: options.project,
        webUrl: options.web,
        aiEnabled: options.ai,
        aiBudget: parseInt(options.budget, 10),
        aiModel: options.aiModel,
        aiUrl: options.aiUrl,
        mcpTargets: [
          {
            command: cmd,
            args: args || []
          }
        ]
      };

      console.log(`Starting Sentinel Platform Scan for project: ${options.project}`);
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

program.parse(process.argv);
