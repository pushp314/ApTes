import * as crypto from 'node:crypto';
import type { Finding } from '@sentinel/shared';
import type { CodeRule, CodeRuleContext } from '../rule.js';
import { SyntaxKind } from 'ts-morph';

export const InsecureDeserializationRule: CodeRule = {
  id: 'insecure-deserialization',
  name: 'Insecure Deserialization Vulnerability',
  category: 'security',
  severity: 'critical',
  confidence: 'high',

  analyze(context: CodeRuleContext): Finding[] {
    const findings: Finding[] = [];
    const sourceFile = context.sourceFile;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      const text = expr.getText();

      // Check node-serialize unserialize() or func-unserialize
      const isUnserialize = text === 'unserialize' || text.endsWith('.unserialize');
      // Check js-yaml unsafe yaml.load() (recommended: yaml.load with schema or yaml.safeLoad)
      const isUnsafeYaml = text === 'yaml.load' || text.endsWith('.load') && callExpr.getText().includes('yaml');

      if (isUnserialize || isUnsafeYaml) {
        const start = callExpr.getStart();
        const pos = sourceFile.getLineAndColumnAtPos(start);

        findings.push({
          id: crypto.randomUUID(),
          projectId: context.projectId,
          runId: null,
          engine: 'code',
          ruleId: this.id,
          category: this.category,
          severity: 'critical',
          confidence: 'high',
          title: isUnserialize
            ? 'Insecure Object Deserialization'
            : 'Unsafe YAML Loading',
          message: isUnserialize
            ? "Unsafe call to 'unserialize()' detected. Deserializing untrusted object payloads can lead to Arbitrary Code Execution."
            : "Call to 'yaml.load()' detected without explicit safe schema configuration. Unsafe YAML loaders allow arbitrary code execution.",
          location: `${context.relativePath}:${pos.line}:${pos.column}`,
          evidence: {
            file: context.relativePath,
            line: pos.line,
            column: pos.column,
            code: callExpr.getText(),
          },
          remediation: isUnserialize
            ? 'Avoid binary/object serialization. Use standard data serialization formats like JSON (JSON.parse) with strict schema validation.'
            : 'Use safe YAML parsers or pass a strict schema configuration (e.g. yaml.load(data, { schema: JSON_SCHEMA })).',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return findings;
  },
};
