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
  .option('-N, --narrate', 'Add AI-written plain-language narratives and audit chapters (requires -A)', false)
  .option('--narrate-budget <number>', 'Max findings to narrate per scan', '4')
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
      const mcpCommand = typeof options.mcp === 'string' ? options.mcp : '';
      const [cmd = '', ...args] = mcpCommand.split(' ');
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
      const report = await runUnifiedPlatform(projectConfig, 30000);

      // Optional AI narration (requires -A). Strictly advisory: it only
      // attaches human-readable narratives and chapters to the report.
      if (options.narrate && projectConfig.aiEnabled) {
        const { NarrativeEngine } = await import('./ai/narrator.js');
        const { AICache } = await import('./ai/cache.js');
        const { MockProvider } = await import('./ai/mock-provider.js');
        const { OllamaProvider } = await import('./ai/ollama-provider.js');
        const engine = new NarrativeEngine(
          projectConfig.aiProvider === 'mock' ? new MockProvider() : new OllamaProvider(),
          new AICache(process.cwd()),
          {
            model: projectConfig.aiModel,
            url: projectConfig.aiUrl,
            budget: parseInt(options.narrateBudget, 10) || 4
          }
        );
        const narrated = await engine.narrate(report.findings);
        report.chapters = await engine.chapterize(report.findings);
        if (narrated > 0 || report.chapters.length > 0) {
          console.log(`[Sentinel AI] Narrated ${narrated} findings, structured ${report.chapters.length} audit chapters.`);
        }
      }

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

program
  .command('pentest [url]')
  .description('Run active penetration testing & access control probes against an authorized target')
  .option('-p, --project <id>', 'Project ID (defaults to auto-generated)')
  .option('-m, --mcp <command>', 'MCP server command to run (e.g. "node server.js")')
  .option('-y, --authorized', 'Confirm that you own or have written permission to test the targets')
  .option('--allow-local', 'Allow localhost/private web targets', false)
  .option('-c, --code <path>', 'Source code directory for backend route discovery')
  .option('-A, --ai', 'Enable AI analysis for low confidence findings', false)
  .option('-f, --format <format>', 'Output format: cli, json, html, md', 'cli')
  .option('-o, --out <file>', 'Output file path')
  .action(async (url, options) => {
    if (!url || !options.authorized) {
      console.error('Error: Pentest mode requires a target URL and explicit authorization (-y / --authorized).');
      console.error('Usage: sentinel pentest <url> -y [-c ./src] [-m "node server.js"]');
      process.exit(1);
    }

    const mcpCommand = typeof options.mcp === 'string' ? options.mcp : '';
    const [cmd = '', ...args] = mcpCommand ? mcpCommand.split(' ') : [];

    const projectConfig = {
      id: options.project || `sentinel-pentest-${Date.now()}`,
      webUrl: url,
      authorizationConfirmed: options.authorized,
      authorizationConfirmedAt: new Date().toISOString(),
      codePath: options.code,
      activePentestMode: true,
      allowLocalTargets: options.allowLocal,
      aiEnabled: options.ai,
      mcpTargets: cmd ? [
        {
          command: cmd,
          args,
          authorizationConfirmed: options.authorized,
          authorizationConfirmedAt: new Date().toISOString(),
        }
      ] : []
    };

    try {
      console.log(`\n🛡️  Starting Sentinel Active Pentest Suite for: ${url}`);
      const report = await runUnifiedPlatform(projectConfig as any, 45000);

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
        console.log(`Pentest report written to ${options.out}`);
      } else {
        console.log('\n' + output);
      }

      if (report.errors.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error('Fatal error during pentest execution:', err);
      process.exit(1);
    }
  });

const securityCmd = program
  .command('security')
  .description('Dedicated security utilities (JWT inspection, HTTP headers audit, and security tools)');

securityCmd
  .command('headers <url>')
  .description('Audit HTTP security headers on a target URL')
  .action(async (targetUrl) => {
    try {
      const { auditSecurityHeaders } = await import('./pentest/security-tools.js');
      console.log(`Auditing security headers for: ${targetUrl}...`);
      const result = await auditSecurityHeaders(targetUrl);
      console.log('\nHTTP Status:', result.statusCode);
      console.log('\nMissing Security Headers:');
      if (result.missingHeaders.length === 0) {
        console.log('  ✅ All critical security headers are present!');
      } else {
        result.missingHeaders.forEach(h => console.log(`  ❌ ${h}`));
      }
      console.log('\nRecommendations:');
      result.recommendations.forEach(r => console.log(`  👉 ${r}`));
    } catch (err) {
      console.error('Failed to audit headers:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

securityCmd
  .command('jwt <token>')
  .description('Inspect and diagnose a JWT token for security weaknesses (insecure algorithm, expiration)')
  .action(async (token) => {
    try {
      const { inspectJwtToken } = await import('./pentest/security-tools.js');
      const result = inspectJwtToken(token);
      console.log('\n--- JWT Inspection Report ---');
      console.log('Algorithm:', result.algorithm);
      console.log('Expired:', result.isExpired ? '🚨 YES' : '✅ NO');
      console.log('\nHeader:', JSON.stringify(result.header, null, 2));
      console.log('\nPayload:', JSON.stringify(result.payload, null, 2));
      if (result.warnings.length > 0) {
        console.log('\nSecurity Warnings:');
        result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
      } else {
        console.log('\n✅ No immediate token format weaknesses detected.');
      }
    } catch (err) {
      console.error('JWT inspection error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Launch the interactive Terminal Mission Control Dashboard')
  .action(async () => {
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const dashboardPy = path.resolve(currentDir, '../../sentinel-py/sentinel.py');
    const child = spawn('python3', [dashboardPy, 'dashboard'], { stdio: 'inherit' });
    child.on('exit', code => process.exit(code ?? 0));
  });

program
  .command('tools')
  .description('Display complete catalog of all Sentinel CLI commands, engines, and pentest tools')
  .action(() => {
    console.log(`
\x1b[1m\x1b[34m================================================================================
   🛡️  SENTINEL MASTER CLI TOOL CATALOG & COMMAND INDEX
================================================================================\x1b[0m

\x1b[1m\x1b[36m1. MISSION CONTROL HUBS & GUIS\x1b[0m
   • \x1b[32msentinel ui\x1b[0m                 Launch local Web Mission Control GUI (http://localhost:3333)
   • \x1b[32msentinel dashboard\x1b[0m          Launch interactive terminal TUI dashboard
   • \x1b[32msentinel\x1b[0m                    Launch interactive 1-Click Zero-Config Express Wizard

\x1b[1m\x1b[36m2. TRI-BOUNDARY APPLICATION SCANNING\x1b[0m
   • \x1b[32msentinel scan <url> -m "<mcp>" -y\x1b[0m
     Full unified scan across Code (AST) + Web (DOM) + MCP (Isolation).
     \x1b[90mOptions: -c <code_path>, -A (Enable AI), -E <dir> (VC Report), -f <format>\x1b[0m

\x1b[1m\x1b[36m3. ACTIVE PENETRATION TESTING & DAST\x1b[0m
   • \x1b[32msentinel pentest <url> -y\x1b[0m   Active access control prober & DAST form fuzzing
   • \x1b[32msentinel security headers <url>\x1b[0m
     Audit HTTP security headers (CSP, HSTS, X-Frame-Options)
   • \x1b[32msentinel security jwt <token>\x1b[0m
     Forensic JWT inspector (flags alg "none", expirations, structural claims)

\x1b[1m\x1b[36m4. PYTHON RECONNAISSANCE & AUDIT SUITE (sentinel-py)\x1b[0m
   • \x1b[32msentinel-py endpoints <url>\x1b[0m Discover API endpoints from JS bundles, HTML & Swagger
   • \x1b[32msentinel-py audit <url>\x1b[0m     Multi-vector audit: Headers + CORS + Cookies + Redirects
   • \x1b[32msentinel-py cors <url>\x1b[0m      CORS origin reflection & credential leakage auditor
   • \x1b[32msentinel-py cookies <url>\x1b[0m   Cookie security & SameSite/CSRF compliance auditor
   • \x1b[32msentinel-py redirect <url>\x1b[0m  Open redirect parameter prober (15+ probes)
   • \x1b[32msentinel-py auth <url>\x1b[0m      Unauthenticated route access prober

\x1b[1m\x1b[36m5. STATIC CODE AST ENGINES (CodeSentinel)\x1b[0m
   • Supports TypeScript, JavaScript (.ts, .js, .tsx, .jsx, .mjs, .cjs) and Python (.py)
   • 18+ AST Rules: SQLi, NoSQLi, SSRF, IDOR, Mass Assignment, Prototype Pollution,
     Insecure Deserialization (Pickle/YAML), Open Redirects, Hardcoded Secrets.

\x1b[1m\x1b[34m================================================================================\x1b[0m
    `);
  });

program
  .command('ui')
  .description('Launch the local Web-based Mission Control Dashboard GUI')
  .option('-p, --port <number>', 'Port to run the dashboard server on', '3333')
  .action(async (options) => {
    const { startDashboardServer } = await import('./dashboard-server.js');
    const port = parseInt(options.port, 10) || 3333;
    await startDashboardServer(port);
    console.log(`\n🚀 Sentinel Mission Control Web GUI is live at: http://localhost:${port}\n`);
  });

program.parse(process.argv);


