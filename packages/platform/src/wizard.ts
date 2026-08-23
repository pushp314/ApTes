import * as p from '@clack/prompts';
import pc from 'picocolors';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { detectStartCommand } from './auto-detect.js';
import { GeminiProvider } from './ai/gemini-provider.js';
import type { ProjectDefinition } from './orchestrator.js';

export async function runInteractiveWizard(): Promise<ProjectDefinition> {
  console.clear();
  p.intro(`${pc.bgBlue(pc.white(' Sentinel Tri-Boundary Orchestrator '))} ${pc.dim('v0.1.0')}`);

  const cwd = process.cwd();

  const mode = await p.select({
    message: 'How would you like to configure Sentinel?',
    options: [
      { value: 'express', label: '🚀 Express Mode (1-Click, Auto-Detect)' },
      { value: 'advanced', label: '⚙️ Advanced Mode (Configure all settings)' }
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start('Analyzing workspace...');
  const detectedCommand = await detectStartCommand(cwd);
  spinner.stop(detectedCommand ? `Detected start command: ${pc.green(detectedCommand)}` : 'Could not auto-detect start command.');

  let mcpCommand = detectedCommand || '';

  if (!detectedCommand) {
    const useGemini = await p.confirm({
      message: 'Would you like Gemini AI to analyze your workspace and suggest the start command?',
      initialValue: true,
    });

    if (useGemini && !p.isCancel(useGemini)) {
      const apiKey = await p.password({
        message: 'Please enter your Gemini API Key:',
        validate: (value) => {
          if (!value) return 'API Key is required to use Gemini.';
        },
      });

      if (typeof apiKey === 'string') {
        spinner.start('Gemini is analyzing your files...');
        const gemini = new GeminiProvider(apiKey);
        const suggested = await gemini.analyzeWorkspaceForCommand(cwd);
        spinner.stop('Gemini analysis complete.');

        if (suggested) {
          p.note(`Gemini suggests: ${pc.cyan(suggested)}`, 'Analysis Result');
          const accept = await p.confirm({
            message: 'Use this command?',
            initialValue: true,
          });
          if (accept) {
            mcpCommand = suggested;
          }
        }
      }
    }
  }

  let webUrl = 'http://localhost:3000';
  let authorized = false;
  let codePath = './';
  let enableAI = false;
  let saveConfig = false;

  if (mode === 'express') {
    p.note(pc.red('By continuing, you confirm you have explicit legal authorization to security test the targets.'), 'Authorization Check');
    
    const webRes = await p.text({
      message: 'Web Application URL:',
      placeholder: 'http://localhost:3000',
      initialValue: 'http://localhost:3000',
    });
    
    if (p.isCancel(webRes)) process.exit(0);
    webUrl = webRes as string;
    
    if (!mcpCommand) {
      const mcpRes = await p.text({
        message: 'Start command for backend MCP server:',
        placeholder: 'node server.js',
      });
      if (p.isCancel(mcpRes)) process.exit(0);
      mcpCommand = mcpRes as string;
    }
    
    authorized = true;
    saveConfig = true; // Automatically save in express mode so future runs are instant
  } else {
    // Advanced Mode
    const project = await p.group(
      {
        web: () =>
          p.text({
            message: 'What is the URL of your Web Application?',
            placeholder: 'http://localhost:3000',
            initialValue: 'http://localhost:3000',
          }),
        mcpCommandFinal: () =>
          p.text({
            message: 'What is the start command for your backend MCP server?',
            initialValue: mcpCommand,
          }),
        hasBackendCode: () =>
          p.confirm({
            message: 'Do you want to run CodeSentinel on the backend source code?',
            initialValue: true,
          }),
        codePath: ({ results }) => {
          if (results.hasBackendCode) {
            return p.text({
              message: 'Where is your backend source code located?',
              initialValue: './',
            });
          }
          return Promise.resolve(undefined);
        },
        enableAI: () =>
          p.confirm({
            message: 'Enable Supercharged Local AI Auditing (requires Ollama)?',
            initialValue: false,
          }),
        authorized: () =>
          p.confirm({
            message: pc.red('Security Authorization Check: Do you own or have explicit written permission to security test this web application and MCP server?'),
            initialValue: false,
          }),
        saveConfig: () =>
          p.confirm({
            message: 'Save this configuration to sentinel.config.json for future 1-click runs?',
            initialValue: true,
          }),
      },
      {
        onCancel: () => {
          p.cancel('Operation cancelled.');
          process.exit(0);
        },
      }
    );

    if (!project.authorized) {
      p.outro(pc.red('Sentinel cannot be used without explicit authorization to test the targets.'));
      process.exit(1);
    }

    webUrl = project.web as string;
    mcpCommand = project.mcpCommandFinal as string;
    codePath = (project.codePath as string) || '';
    enableAI = project.enableAI as boolean;
    authorized = project.authorized as boolean;
    saveConfig = project.saveConfig as boolean;
  }

  const [cmd = '', ...args] = (mcpCommand ?? '').split(' ');
  const config: ProjectDefinition = {
    id: `sentinel-project-${Date.now()}`,
    webUrl,
    authorizationConfirmed: authorized,
    authorizationConfirmedAt: new Date().toISOString(),
    codePath,
    excludePatterns: [],
    skipTypeErrors: false,
    allowLocalTargets: true,
    aiEnabled: enableAI,
    aiBudget: 5,
    aiModel: 'llama3',
    aiUrl: 'http://localhost:11434',
    aiProvider: 'ollama',
    mcpTargets: [
      {
        name: 'backend',
        command: cmd,
        args,
        authorizationConfirmed: authorized,
        authorizationConfirmedAt: new Date().toISOString(),
      },
    ],
  };

  if (saveConfig) {
    spinner.start('Saving sentinel.config.json');
    await fs.writeFile(
      path.resolve(process.cwd(), 'sentinel.config.json'),
      JSON.stringify(config, null, 2),
      'utf8'
    );
    spinner.stop('Saved sentinel.config.json');
  }

  p.outro(pc.green('Configuration complete! Starting Sentinel analysis...'));
  
  return config;
}
