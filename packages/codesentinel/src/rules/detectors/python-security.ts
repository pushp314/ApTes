import { CodeRule } from '../rule.js';
import type { Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';
import type { SyntaxNode } from 'tree-sitter';

export const PythonSecurityRule: CodeRule = {
  id: 'python-security',
  name: 'Python Web Security Suite',
  category: 'security',
  severity: 'high',
  confidence: 'high',

  analyze(context) {
    const findings: Finding[] = [];
    if (!context.parseResult) return findings;

    for (const pyFile of context.parseResult.pythonFiles) {
      const root = pyFile.tree.rootNode;
      const callNodes = findNodesOfType(root, 'call');

      for (const call of callNodes) {
        const funcNode = call.childForFieldName('function');
        if (!funcNode) continue;
        const funcText = funcNode.text;
        const argsNode = call.childForFieldName('arguments');
        const argsText = argsNode ? argsNode.text : '';
        const line = call.startPosition.row + 1;
        const col = call.startPosition.column + 1;

        // 1. Python Mass Assignment: Model(**request.json) or update(**data)
        if (argsNode && /\*\*(request\.|req\.|data|payload|params)/.test(argsText)) {
          findings.push({
            id: randomUUID(),
            projectId: context.projectId,
            runId: null,
            engine: 'code',
            ruleId: 'python-mass-assignment',
            category: 'authorization',
            severity: 'high',
            confidence: 'high',
            title: 'Mass Assignment via Dictionary Unpacking',
            message: `Raw request dictionary is unpacked directly into '${funcText}(**...)' without property whitelisting.`,
            location: `${pyFile.relativePath}:${line}:${col}`,
            evidence: {
              file: pyFile.relativePath,
              line,
              column: col,
              code: call.text.slice(0, 300),
            },
            remediation: 'Use strict schema validation (e.g. Pydantic models with explicit fields) rather than unpacking raw request dictionaries.',
            timestamp: new Date().toISOString(),
          });
        }

        // 2. Python SQL Injection: cursor.execute(f"SELECT... {var}") or .execute("SELECT..." % var)
        const isDbExecute = /execute|raw_sql|execute_query|query_raw/.test(funcText) ||
          /\.(execute|raw)$/.test(funcText);

        if (isDbExecute && argsNode) {
          let hasUnsafeSql = argsText.includes('f"') || argsText.includes("f'") ||
            /["']\s*%\s*\w+/.test(argsText) ||
            /\.format\(/.test(argsText);

          // If the argument is a variable name (e.g. cursor.execute(query)), check enclosing scope for assignments to that variable
          if (!hasUnsafeSql) {
            let parentNode: SyntaxNode | null = call.parent;
            while (parentNode && parentNode.type !== 'function_definition' && parentNode.type !== 'module') {
              parentNode = parentNode.parent;
            }

            if (parentNode) {
              const assignments = findNodesOfType(parentNode, 'assignment');
              for (const assign of assignments) {
                const left = assign.childForFieldName('left');
                const right = assign.childForFieldName('right');
                if (left && right && argsText.includes(left.text)) {
                  const rightText = right.text;
                  if (rightText.includes('f"') || rightText.includes("f'") ||
                      /["']\s*%\s*\w+/.test(rightText) ||
                      /\.format\(/.test(rightText) ||
                      /(\+|SELECT|INSERT|UPDATE|DELETE)/i.test(rightText)) {
                    hasUnsafeSql = true;
                    break;
                  }
                }
              }
            }
          }

          if (hasUnsafeSql) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-sqli',
              category: 'injection',
              severity: 'critical',
              confidence: 'high',
              title: 'Python SQL Injection via String Interpolation',
              message: `Unsafe string formatting detected in database query '${funcText}'. User input may alter query structure.`,
              location: `${pyFile.relativePath}:${line}:${col}`,
              evidence: {
                file: pyFile.relativePath,
                line,
                column: col,
                code: call.text.slice(0, 300),
              },
              remediation: 'Use parameterized queries: pass query parameters as a tuple/dictionary argument (e.g., cursor.execute("SELECT ... %s", (param,)))',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // 3. Python SSRF: requests.get(user_input), httpx.get(url), urllib.request.urlopen(url)
        const isHttpCall = /^(requests\.(get|post|put|delete|request)|httpx\.(get|post)|urllib\.request\.urlopen)/.test(funcText);
        if (isHttpCall && argsNode) {
          const isUserUrl = /(url|target|req\.|request\.|params|webhook|endpoint)/i.test(argsText);
          // If it's a dynamic variable and not a static string literal
          if (isUserUrl && !/^[\s(]*["']https?:\/\//.test(argsText)) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-ssrf',
              category: 'network',
              severity: 'high',
              confidence: 'high',
              title: 'Potential Server-Side Request Forgery (SSRF)',
              message: `HTTP client '${funcText}' makes a backend request to a user-controlled URL without private IP validation.`,
              location: `${pyFile.relativePath}:${line}:${col}`,
              evidence: {
                file: pyFile.relativePath,
                line,
                column: col,
                code: call.text.slice(0, 300),
              },
              remediation: 'Validate and sanitize destination URLs against an allowlist and block internal network ranges (127.0.0.1, 169.254.169.254, 10.0.0.0/8).',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // 4. Python Insecure JWT: jwt.decode(..., verify=False) or options={"verify_signature": False}
        if (funcText.includes('jwt.decode') && argsNode) {
          const disabledSig = /verify_signature["']?\s*:\s*False|verify\s*=\s*False/i.test(argsText);
          const noneAlg = /algorithms\s*=\s*\[.*["']none["'].*\]/i.test(argsText);

          if (disabledSig || noneAlg) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-insecure-jwt',
              category: 'authentication',
              severity: 'critical',
              confidence: 'high',
              title: 'Insecure JWT Verification in Python',
              message: disabledSig
                ? "JWT signature verification is disabled ('verify_signature': False), allowing arbitrary token forgery."
                : "JWT decoder explicitly permits insecure 'none' algorithm.",
              location: `${pyFile.relativePath}:${line}:${col}`,
              evidence: {
                file: pyFile.relativePath,
                line,
                column: col,
                code: call.text.slice(0, 300),
              },
              remediation: "Always enforce signature verification and restrict allowed algorithms to secure asymmetric/symmetric ciphers (e.g. ['HS256', 'RS256']).",
              timestamp: new Date().toISOString(),
            });
          }
        }

        // 5. Python IDOR: Model.objects.get(id=user_input) or User.query.get(id)
        const isIdorQuery = /\.(objects\.get|query\.get|filter_by)\(/.test(call.text);
        if (isIdorQuery && argsNode) {
          const hasSingleIdLookup = /(id\s*=\s*|pk\s*=\s*|^[^\w]*)(doc_id|user_id|item_id|id|pk)[\s,)]/.test(argsText);
          const hasTenantCheck = /(user_id\s*=|owner_id\s*=|account_id\s*=|current_user)/.test(argsText);

          if (hasSingleIdLookup && !hasTenantCheck) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-idor',
              category: 'authorization',
              severity: 'high',
              confidence: 'low',
              title: 'Potential Insecure Direct Object Reference (IDOR)',
              message: `Database query '${funcText}' looks up records by raw ID without correlating against the authenticated user/tenant session.`,
              location: `${pyFile.relativePath}:${line}:${col}`,
              evidence: {
                file: pyFile.relativePath,
                line,
                column: col,
                code: call.text.slice(0, 300),
              },
              remediation: 'Always include the authenticated user/organization constraint in query filters (e.g., Model.objects.get(id=id, user_id=current_user.id)).',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // 6. Python Insecure Deserialization: pickle.loads(...) or yaml.load without SafeLoader
        if ((funcText.includes('pickle.loads') || funcText.includes('cPickle.loads') || funcText.includes('marshal.loads')) && argsNode) {
          findings.push({
            id: randomUUID(),
            projectId: context.projectId,
            runId: null,
            engine: 'code',
            ruleId: 'python-insecure-deserialization',
            category: 'security',
            severity: 'critical',
            confidence: 'high',
            title: 'Insecure Python Object Deserialization (Pickle)',
            message: `Call to '${funcText}()' detected. Deserializing untrusted pickle streams allows immediate Arbitrary Code Execution.`,
            location: `${pyFile.relativePath}:${line}:${col}`,
            evidence: {
              file: pyFile.relativePath,
              line,
              column: col,
              code: call.text.slice(0, 300),
            },
            remediation: 'Never use pickle or marshal to deserialize untrusted user input. Use safe data formats like JSON (json.loads()).',
            timestamp: new Date().toISOString(),
          });
        }

        if (funcText.includes('yaml.load') && argsNode && !argsText.includes('SafeLoader')) {
          findings.push({
            id: randomUUID(),
            projectId: context.projectId,
            runId: null,
            engine: 'code',
            ruleId: 'python-unsafe-yaml',
            category: 'security',
            severity: 'high',
            confidence: 'high',
            title: 'Unsafe YAML Deserialization in Python',
            message: "Call to 'yaml.load()' detected without 'Loader=yaml.SafeLoader'. Unsafe YAML parsing can lead to remote code execution.",
            location: `${pyFile.relativePath}:${line}:${col}`,
            evidence: {
              file: pyFile.relativePath,
              line,
              column: col,
              code: call.text.slice(0, 300),
            },
            remediation: "Use 'yaml.safe_load()' or specify 'Loader=yaml.SafeLoader' in yaml.load().",
            timestamp: new Date().toISOString(),
          });
        }

        // 7. Python Open Redirect: redirect(request.args.get('url')) or redirect(target)
        if ((funcText === 'redirect' || funcText.endsWith('.redirect')) && argsNode) {
          let isTaintedRedirect = /(request\.|req\.|args\.get|values\.get|params)/i.test(argsText);

          if (!isTaintedRedirect) {
            let parentNode: SyntaxNode | null = call.parent;
            while (parentNode && parentNode.type !== 'function_definition' && parentNode.type !== 'module') {
              parentNode = parentNode.parent;
            }

            if (parentNode) {
              const assignments = findNodesOfType(parentNode, 'assignment');
              for (const assign of assignments) {
                const left = assign.childForFieldName('left');
                const right = assign.childForFieldName('right');
                if (left && right && argsText.includes(left.text)) {
                  const rightText = right.text;
                  if (/(request\.|req\.|args\.get|values\.get|params)/i.test(rightText)) {
                    isTaintedRedirect = true;
                    break;
                  }
                }
              }
            }
          }

          if (isTaintedRedirect) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-open-redirect',
              category: 'security',
              severity: 'high',
              confidence: 'high',
              title: 'Python Open Redirect',
              message: `User-controlled parameter is passed directly to '${funcText}()' without domain whitelist validation.`,
              location: `${pyFile.relativePath}:${line}:${col}`,
              evidence: {
                file: pyFile.relativePath,
                line,
                column: col,
                code: call.text.slice(0, 300),
              },
              remediation: "Validate redirect URLs using url_for() with internal endpoints or check netloc against an approved domain whitelist.",
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return findings;
  },
};

function findNodesOfType(node: SyntaxNode, type: string): SyntaxNode[] {
  const results: SyntaxNode[] = [];
  const traverse = (n: SyntaxNode) => {
    if (n.type === type) results.push(n);
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) traverse(child);
    }
  };
  traverse(node);
  return results;
}
