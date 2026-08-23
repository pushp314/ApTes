import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// For MVP, a hardcoded dictionary of known high-risk CVEs
const KNOWN_VULNERABLE_DEPENDENCIES: Record<string, string> = {
  'lodash': '4.17.20', // CVE-2021-23337 (Command Injection)
  'express': '4.18.2', // CVE-2024-29041 (Open Redirect)
  'axios': '1.5.0',    // CVE-2023-45857 (SSRF)
};

const scannedPackageJsons = new Set<string>();

export const DependencyCveRule: CodeRule = {
  id: 'dependency-cve',
  name: 'Vulnerable Dependency Detected',
  category: 'security',
  severity: 'critical',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    
    let dir = path.dirname(context.sourceFile.getFilePath());
    let packageJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      packageJsonPath = path.join(dir, '..', 'package.json');
    }
    
    if (fs.existsSync(packageJsonPath)) {
      if (scannedPackageJsons.has(packageJsonPath)) return [];
      scannedPackageJsons.add(packageJsonPath);

      try {
        const pkgStr = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(pkgStr);
        
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        
        for (const [name, version] of Object.entries(deps)) {
          const cleanVersion = (version as string).replace(/[\^~]/g, '');
          if (KNOWN_VULNERABLE_DEPENDENCIES[name] && KNOWN_VULNERABLE_DEPENDENCIES[name] === cleanVersion) {
            findings.push({
              id: crypto.randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: this.id,
              category: this.category,
              severity: this.severity,
              confidence: this.confidence,
              title: `Vulnerable Dependency: ${name}@${cleanVersion}`,
              message: `The project uses a known vulnerable version of '${name}'.`,
              location: `package.json`,
              evidence: {
                file: 'package.json',
                line: 1,
                column: 1,
                code: `"${name}": "${version}"`,
              },
              remediation: `Upgrade ${name} to a secure version immediately.`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        // Ignore parse errors for MVP
      }
    }

    return findings;
  },
};
