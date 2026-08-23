import { Node, SyntaxKind } from 'ts-morph';

/**
 * Resolves an expression to its origin definitions by traversing variables and assignments.
 * This performs structural data-flow tracking (up to a max depth) without relying on strict type checking.
 *
 * @param node The AST Node to trace
 * @param maxDepth Maximum recursive depth to prevent infinite loops
 * @returns Array of origin Nodes where the value is defined
 */
export function resolveExpression(node: Node, maxDepth = 3): Node[] {
  if (maxDepth <= 0 || !node) {
    return [node];
  }

  // If it's a literal or template, we've found a concrete value origin
  if (
    Node.isStringLiteral(node) ||
    Node.isNumericLiteral(node) ||
    Node.isTemplateExpression(node) ||
    Node.isBinaryExpression(node) // e.g. "a" + "b"
  ) {
    return [node];
  }

  // If it's an Identifier (variable reference), trace its definition
  if (Node.isIdentifier(node)) {
    let defs: Node[] = [];
    try {
      defs = node.getDefinitionNodes();
    } catch (e) {
      // Language Service may crash on malformed projects
    }
    
    if (defs.length === 0) {
      return [node]; // Could not resolve further
    }

    const resolvedNodes: Node[] = [];

    for (const def of defs) {
      if (def.isKind(SyntaxKind.Parameter)) {
        // Phase 18: Cross-Function/Cross-File Data Flow
        // If the variable is a parameter, find where this function is called!
        const param = def;
        const func = param.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                     param.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ||
                     param.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
                     param.getFirstAncestorByKind(SyntaxKind.FunctionExpression);

        if (func) {
          const index = func.getParameters().findIndex(p => p === param);

          if (index !== -1) {
            // Find all references to this function
            const functionNameNode = func.isKind(SyntaxKind.FunctionDeclaration) || func.isKind(SyntaxKind.MethodDeclaration) ? func.getNameNode() : null;
            
            // If it's an arrow function assigned to a variable, find references to the variable
            let refNode: Node | null | undefined = functionNameNode as Node | null | undefined;
            if (!refNode && (func.isKind(SyntaxKind.ArrowFunction) || func.isKind(SyntaxKind.FunctionExpression))) {
               const varDecl = func.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
               if (varDecl) {
                 refNode = varDecl.getNameNode();
               } else {
                 const binExpr = func.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
                 if (binExpr) {
                   const left = binExpr.getLeft();
                   if (Node.isPropertyAccessExpression(left)) {
                     refNode = left.getNameNode();
                   } else if (Node.isIdentifier(left)) {
                     refNode = left;
                   }
                 }
               }
            }

            if (refNode && Node.isIdentifier(refNode)) {
              let refs: Node[] = [];
              try {
                refs = refNode.findReferencesAsNodes();
              } catch (e) {
                // Ignore Language Service crashes
              }
              for (const ref of refs) {
                const callExpr = ref.getFirstAncestorByKind(SyntaxKind.CallExpression);
                if (callExpr && callExpr.getExpression().getText().endsWith(ref.getText())) {
                  const args = callExpr.getArguments();
                  if (args.length > index && args[index]) {
                    resolvedNodes.push(...resolveExpression(args[index] as Node, maxDepth - 1));
                  }
                }
              }
            } else {
              resolvedNodes.push(def);
            }
          } else {
            resolvedNodes.push(def);
          }
        } else {
          resolvedNodes.push(def);
        }
      } else {
        let initializer: Node | undefined;

        if (def.isKind(SyntaxKind.VariableDeclaration)) {
          initializer = def.getInitializer();
        } else {
          const varDecl = def.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
          if (varDecl) {
            initializer = varDecl.getInitializer();
          }
        }

        if (initializer) {
          // Phase 18: Cross-File CommonJS require() Tracking
          if (Node.isCallExpression(initializer) && initializer.getExpression().getText() === 'require') {
            const arg = initializer.getArguments()[0];
            if (Node.isStringLiteral(arg)) {
              const modulePath = arg.getLiteralText();
              const sourceFile = node.getSourceFile();
              const dir = sourceFile.getDirectory();
              // Try to find the required file in the project
              const targetFile = dir.getSourceFile(modulePath + '.js') || 
                                 dir.getSourceFile(modulePath + '.ts') ||
                                 dir.getSourceFile(modulePath + '/index.js');
                                 
              if (targetFile) {
                 // Find module.exports or exports assignments
                 const assignments = targetFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).filter(exp => {
                   const left = exp.getLeft().getText();
                   return left.startsWith('module.exports') || left.startsWith('exports.');
                 });
                 
                 if (assignments.length > 0) {
                   for (const assign of assignments) {
                     resolvedNodes.push(...resolveExpression(assign.getRight(), maxDepth - 1));
                   }
                   return resolvedNodes;
                 }
              }
            }
          }
          // Recursively resolve the initializer
          resolvedNodes.push(...resolveExpression(initializer, maxDepth - 1));
        } else if (def.isKind(SyntaxKind.ImportSpecifier)) {
          // Phase 18: Cross-File Data Flow via ES6 Imports
          const importSpecifier = def;
          const nameNode = importSpecifier.getNameNode();
          const importDecl = importSpecifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
          
          if (importDecl && Node.isIdentifier(nameNode)) {
            let exportDefs: Node[] = [];
            try {
              exportDefs = nameNode.getDefinitionNodes();
            } catch {
              // Ignore
            }
            // Filter out the ImportSpecifier itself to prevent infinite loops
            const externalDefs = exportDefs.filter(d => !d.isKind(SyntaxKind.ImportSpecifier));
            if (externalDefs.length > 0) {
              for (const edef of externalDefs) {
                resolvedNodes.push(...resolveExpression(edef, maxDepth - 1));
              }
            } else {
              resolvedNodes.push(def);
            }
          } else {
            resolvedNodes.push(def);
          }
        } else {
          resolvedNodes.push(def);
        }
      }
    }

    return resolvedNodes.length > 0 ? resolvedNodes : [node];
  }

  return [node];
}

/**
 * Heuristically determines if a given AST Node represents an untrusted user input source.
 */
export function isTaintSource(node: Node): boolean {
  const text = node.getText();
  const taintPatterns = [
    'req.body', 'req.query', 'req.params', 'req.headers',
    'request.body', 'request.query', 'request.params', 'request.headers',
    'event.body', 'event.queryStringParameters' // AWS Lambda
  ];
  return taintPatterns.some(pattern => text.includes(pattern));
}
