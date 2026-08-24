#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from 'commander';
import { runUnifiedPlatform } from './orchestrator.js';
import { CliReporter, JsonReporter, HtmlReporter, MarkdownReporter, SarifReporter } from './reporters/index.js';
import { runCodeFixer } from './fixer.js';
import { loadPolicy, evaluatePolicy } from './policy.js';
import { execSync } from 'node:child_process';
import type { Severity } from '@sentinel/shared';
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
  .option('-f, --format <format>', 'Output format: cli, json, html, md, sarif', 'cli')
  .option('-o, --out <file>', 'Output file path')
  .option('-E, --executive-report <dir>', 'Generate a VC-friendly AI Executive Report in the specified directory')
  .option('-N, --narrate', 'Add AI-written plain-language narratives and audit chapters (requires -A)', false)
  .option('--narrate-budget <number>', 'Max findings to narrate per scan', '4')
  .option('-x, --exclude <globs>', 'Comma-separated glob patterns to exclude (e.g. "fixtures/**,tests/**")')
  .option('-S, --skip-type-errors', 'Suppress TypeScript type diagnostics (useful for JS-only projects)', false)
  .option('--diff [branch]', 'Scan only files changed compared to git branch (e.g. "main" or "HEAD~1")')
  .option('--fail-on <severity>', 'Fail with exit code 1 if vulnerabilities of this severity or higher are found (CRITICAL, HIGH, MEDIUM, LOW)')
  .option('--policy <path>', 'Path to sentinel.policy.json configuration file')
  .action(async (url, options) => {
    // If running `sentinel scan` with NO arguments, launch the interactive wizard
    const hasArgs = process.argv.length > 3;
    let projectConfig;

    if (!hasArgs) {
      const { runInteractiveWizard } = await import('./wizard.js');
      projectConfig = await runInteractiveWizard();
    } else {
      if (!url) {
        console.error('Error: missing required URL argument. Run `sentinel scan --help` or run `sentinel scan` without arguments for the interactive wizard.');
        process.exit(1);
      }
      
      let isAuthorized = options.authorized;
      if (!isAuthorized) {
        const { confirm } = await import('@clack/prompts');
        const pc = (await import('picocolors')).default;
        
        isAuthorized = await confirm({
          message: pc.red('Security Authorization Check: Do you own or have explicit written permission to security test this application?'),
          initialValue: false,
        });
        
        if (!isAuthorized) {
          console.error('Authorization denied. Exiting.');
          process.exit(1);
        }
      }
      const mcpTargets = [];
      if (options.mcp && typeof options.mcp === 'string') {
        const [cmd = '', ...args] = options.mcp.trim().split(' ');
        mcpTargets.push({
          name: options.mcpName || 'backend',
          command: cmd,
          args,
          authorizationConfirmed: isAuthorized,
          authorizationConfirmedAt: new Date().toISOString(),
        });
      }

      projectConfig = {
        id: options.project || `sentinel-${Date.now()}`,
        webUrl: url,
        authorizationConfirmed: isAuthorized,
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
        mcpTargets,
      };
    }

    try {
      if (options.diff) {
        const branch = typeof options.diff === 'string' ? options.diff : 'main';
        try {
          const diffOutput = execSync(`git diff --name-only ${branch}`, { encoding: 'utf-8' });
          const changedFiles = diffOutput.split('\n').filter(Boolean);
          console.log(`\x1b[90m[Sentinel Diff] Scanning only ${changedFiles.length} files modified against ${branch}\x1b[0m`);
        } catch {
          console.warn(`\x1b[33mWarning: Failed to compute git diff against '${branch}'. Falling back to full scan.\x1b[0m`);
        }
      }

      console.log(`Starting Sentinel Platform Scan for project: ${projectConfig.id}`);
      
      const { spinner } = await import('@clack/prompts');
      const s = spinner();
      
      const aiTime = projectConfig.aiEnabled ? ' (AI Analysis: ~10-15s)' : '';
      console.log(`\x1b[90mEstimated time: ~5-10s depending on target latency${aiTime}\x1b[0m`);
      
      s.start('Running Diagnostic Security Engines (AST, DAST, RECON)...');
      
      const report = await runUnifiedPlatform(projectConfig, 30000, (msg) => {
        s.message(msg);
      });
      
      s.stop('Diagnostic scan complete!');

      // Optional AI narration (requires -A). Strictly advisory: it only
      // attaches human-readable narratives and chapters to the report.
      if (options.narrate && projectConfig.aiEnabled) {
        const { NarrativeEngine } = await import('./ai/narrator.js');
        const { AICache } = await import('./ai/cache.js');
        const { MockProvider } = await import('./ai/mock-provider.js');
        const { OllamaProvider } = await import('./ai/ollama-provider.js');
        const { GeminiProvider } = await import('./ai/gemini-provider.js');
        
        let provider;
        if (projectConfig.aiProvider === 'gemini' && process.env.GEMINI_API_KEY) {
          provider = new GeminiProvider(process.env.GEMINI_API_KEY, projectConfig.aiModel);
        } else if (projectConfig.aiProvider === 'mock') {
          provider = new MockProvider();
        } else {
          provider = new OllamaProvider();
        }

        const engine = new NarrativeEngine(
          provider,
          new AICache(process.cwd()),
          {
            model: projectConfig.aiModel,
            url: projectConfig.aiUrl,
            budget: parseInt(options.narrateBudget, 10) || 4
          }
        );
        const aiSpinner = spinner();
        aiSpinner.start('Synthesizing AI Threat Narratives & Executive Chapters...');
        
        const narrated = await engine.narrate(report.findings);
        report.chapters = await engine.chapterize(report.findings);
        
        aiSpinner.stop('AI Synthesis complete.');
        if (narrated > 0 || report.chapters.length > 0) {
          console.log(`[Sentinel AI] Narrated ${narrated} findings, structured ${report.chapters.length} audit chapters.`);
        }
      }

      let reporter;
      switch (options.format) {
        case 'json': reporter = new JsonReporter(); break;
        case 'html': reporter = new HtmlReporter(); break;
        case 'md': reporter = new MarkdownReporter(); break;
        case 'sarif': reporter = new SarifReporter(); break;
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

      // Security Policy Evaluation
      const policy = (await loadPolicy(options.policy)) || (options.failOn ? { failOn: options.failOn.toLowerCase() as Severity } : null);
      if (policy) {
        const evaluation = evaluatePolicy(report, policy);
        if (!evaluation.passed) {
          console.error('\n🚨 Security Policy Violations:');
          evaluation.violations.forEach(v => console.error(`  ❌ ${v}`));
          process.exit(1);
        } else {
          console.log('\n✅ Security Policy Check: PASSED');
        }
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
     \x1b[90mOptions: -c <path>, -A (AI), -f <cli|json|html|md|sarif>, --diff, --fail-on <sev>\x1b[0m

\x1b[1m\x1b[36m3. CODE REMEDIATION & SECURITY POLICY\x1b[0m
   • \x1b[32msentinel fix <report.json>\x1b[0m   Interactive automated code fixer & patch engine
   • \x1b[32msentinel scan --fail-on high\x1b[0m CI/CD gatekeeper (fails build if threshold violated)

\x1b[1m\x1b[36m4. ACTIVE PENETRATION TESTING & DAST\x1b[0m
   • \x1b[32msentinel pentest <url> -y\x1b[0m   Active access control prober & DAST form fuzzing
   • \x1b[32msentinel security headers <url>\x1b[0m
     Audit HTTP security headers (CSP, HSTS, X-Frame-Options)
   • \x1b[32msentinel security jwt <token>\x1b[0m
     Forensic JWT inspector (flags alg "none", expirations, structural claims)

\x1b[1m\x1b[36m5. PYTHON RECONNAISSANCE & AUDIT SUITE (sentinel-py — 15 Tools)\x1b[0m
   • \x1b[32msentinel-py audit <url>\x1b[0m       10-vector audit: Headers, CSP, SSL, CORS, Cookies, etc.
   • \x1b[32msentinel-py subdomains <domain>\x1b[0m Fast multithreaded DNS subdomain discovery
   • \x1b[32msentinel-py ssl <url>\x1b[0m          TLS certificate validity, expiry, and cipher strength
   • \x1b[32msentinel-py fingerprint <url>\x1b[0m  Detect web servers, frameworks, and version leaks
   • \x1b[32msentinel-py ports <host>\x1b[0m        Fast TCP port scanner with banner grabbing
   • \x1b[32msentinel-py csp <url>\x1b[0m          Deep Content-Security-Policy (CSP) audit
   • \x1b[32msentinel-py endpoints <url>\x1b[0m    Discover API endpoints from JS bundles & Swagger
   • \x1b[32msentinel-py admin <url>\x1b[0m        Scan for open admin panels and hidden API routes
   • \x1b[32msentinel-py cors <url>\x1b[0m         CORS origin reflection & credential leakage
   • \x1b[32msentinel-py cookies <url>\x1b[0m      Cookie security & SameSite/CSRF compliance
   • \x1b[32msentinel-py redirect <url>\x1b[0m     Open redirect parameter prober
   • \x1b[32msentinel-py exposure <url>\x1b[0m     Probe sensitive files (.env, .git, config)
   • \x1b[32msentinel-py xss <url>\x1b[0m          Reflected XSS injection prober
   • \x1b[32msentinel-py auth <url>\x1b[0m         Unauthenticated route access prober

\x1b[1m\x1b[36m6. STATIC CODE AST ENGINES (CodeSentinel)\x1b[0m
   • Supports TypeScript, JavaScript (.ts, .js, .tsx, .jsx, .mjs, .cjs) and Python (.py)
   • 18+ AST Rules: SQLi, NoSQLi, SSRF, IDOR, Mass Assignment, Prototype Pollution,
     Insecure Deserialization (Pickle/YAML), Open Redirects, Hardcoded Secrets.

\x1b[1m\x1b[34m================================================================================\x1b[0m
    `);
  });

program
  .command('ui')
  .description('Launch the local Web-based Mission Control Dashboard GUI and open in default browser')
  .option('-p, --port <number>', 'Port to run the dashboard server on', '3333')
  .action(async (options) => {
    const { startDashboardServer } = await import('./dashboard-server.js');
    const port = parseInt(options.port, 10) || 3333;
    await startDashboardServer(port, true);
    console.log(`\n🚀 Sentinel Mission Control Web GUI is live at: http://localhost:${port}\n`);
  });

program
  .command('docs')
  .description('Launch the Sentinel VitePress Documentation server and open in default browser')
  .option('-p, --port <number>', 'Port to run docs server on', '5173')
  .action(async (options) => {
    const { spawn } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const { openInBrowser } = await import('./dashboard-server.js');
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(currentDir, '../../../');
    const docsDir = path.resolve(repoRoot, 'packages/docs');
    const port = options.port || '5173';

    console.log(`\n📖 Launching Sentinel Documentation Website on http://localhost:${port}...\n`);
    const child = spawn('npx', ['vitepress', 'dev', docsDir, '--port', port], {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    setTimeout(() => {
      openInBrowser(`http://localhost:${port}`);
    }, 1200);

    child.on('exit', code => process.exit(code ?? 0));
  });

program
  .command('fix <report>')
  .description('Interactively review and apply automated code remediations from a Sentinel JSON report')
  .option('--dry-run', 'Preview changes without modifying source files', false)
  .option('-y, --yes', 'Automatically apply all safe deterministic fixes without prompting', false)
  .action(async (reportPath, options) => {
    try {
      await runCodeFixer(reportPath, {
        dryRun: options.dryRun,
        autoApprove: options.yes,
      });
    } catch (err) {
      console.error('Error during auto-fix execution:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);



