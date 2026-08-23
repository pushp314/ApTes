import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import type { Project } from 'ts-morph';

const scannedProjects = new WeakSet<Project>();

export const ConfigDriftRule: CodeRule = {
  id: 'config-drift',
  name: 'Configuration Drift',
  category: 'configuration',
  severity: 'high',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    // Ensure this rule only runs once per project scan
    if (scannedProjects.has(context.project)) {
      return [];
    }
    scannedProjects.add(context.project);

    const findings: Finding[] = [];
    
    const composePath = path.join(context.targetDir, 'docker-compose.yml');
    const envExamplePath = path.join(context.targetDir, '.env.example');

    if (!fs.existsSync(composePath) || !fs.existsSync(envExamplePath)) {
      return []; // Nothing to compare
    }

    try {
      const composeContent = fs.readFileSync(composePath, 'utf8');
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

      // Naive regex to extract env variables from docker-compose.yml
      // Looks for `- MY_ENV_VAR=${MY_ENV_VAR}` or `MY_ENV_VAR: ${MY_ENV_VAR}`
      const composeVars = new Set<string>();
      
      // Match ${VAR} interpolation
      const interpolatePattern = /\$\{([A-Z0-9_]+)\}/g;
      let match;
      while ((match = interpolatePattern.exec(composeContent)) !== null) {
        if (match[1]) composeVars.add(match[1]);
      }
      
      // Also match plain KEY=value pairs if needed, but standard practice is interpolation
      const envPattern = /\b([A-Z0-9_]+)=/g;
      while ((match = envPattern.exec(composeContent)) !== null) {
        if (match[1]) composeVars.add(match[1]);
      }

      // Extract vars from .env.example
      const envExampleVars = new Set<string>();
      const envExamplePattern = /^\s*([A-Z0-9_]+)=/gm;
      while ((match = envExamplePattern.exec(envExampleContent)) !== null) {
        if (match[1]) envExampleVars.add(match[1]);
      }

      // Find drift
      for (const requiredVar of composeVars) {
        if (!envExampleVars.has(requiredVar)) {
          findings.push({
            id: crypto.randomUUID(),
            projectId: context.projectId,
            runId: null,
            engine: 'code',
            ruleId: this.id,
            category: this.category,
            severity: this.severity,
            confidence: this.confidence,
            title: 'Configuration Drift',
            message: `Environment variable '${requiredVar}' is required by docker-compose.yml but missing from .env.example.`,
            location: 'docker-compose.yml',
            evidence: {
              variable: requiredVar,
              source: 'docker-compose.yml',
              missingIn: '.env.example',
            },
            remediation: `Add '${requiredVar}' to .env.example to ensure developers and CI systems know it is required.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      // Ignore read errors
    }

    return findings;
  },
};
