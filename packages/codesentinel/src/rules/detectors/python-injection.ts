import { CodeRule } from '../rule.js';
import type { Finding } from '@sentinel/shared';
import { randomUUID } from 'node:crypto';

export const PythonInjectionRule: CodeRule = {
  id: 'python-injection',
  name: 'Python Injection',
  category: 'injection',
  severity: 'critical',
  confidence: 'high',
  
  analyze(context) {
    const findings: Finding[] = [];
    if (!context.parseResult) return findings;

    // Scan all python files
    for (const pyFile of context.parseResult.pythonFiles) {
      // Find all call expressions
      const callNodes = findNodesOfType(pyFile.tree.rootNode, 'call');
      
      for (const call of callNodes) {
        // Get the function name (identifier or attribute)
        const funcNode = call.childForFieldName('function');
        if (!funcNode) continue;
        
        const funcName = funcNode.text;
        
        // Unsafe eval or exec
        if (funcName === 'eval' || funcName === 'exec') {
          // Check if arguments include a string or variable (very basic check)
          const argsNode = call.childForFieldName('arguments');
          if (argsNode) {
            findings.push({
              id: randomUUID(),
              projectId: context.projectId,
              runId: null,
              engine: 'code',
              ruleId: 'python-injection',
              category: 'injection',
              severity: 'critical',
              confidence: 'high',
              title: 'Unsafe Python Code Execution',
              message: `Found unsafe use of '${funcName}()'.`,
              location: `${pyFile.relativePath}:${call.startPosition.row + 1}`,
              evidence: {
                code: call.text,
                function: funcName
              },
              remediation: `Avoid using ${funcName}(). If you must parse data, use ast.literal_eval() or a safe JSON parser.`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    return findings;
  }
};

function findNodesOfType(node: import('tree-sitter').SyntaxNode, type: string): import('tree-sitter').SyntaxNode[] {
  const results: import('tree-sitter').SyntaxNode[] = [];
  const traverse = (n: import('tree-sitter').SyntaxNode) => {
    if (n.type === type) results.push(n);
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) traverse(child);
    }
  };
  traverse(node);
  return results;
}
