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
    const defs = node.getDefinitionNodes();
    if (defs.length === 0) {
      return [node]; // Could not resolve further
    }

    const resolvedNodes: Node[] = [];

    for (const def of defs) {
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
        // Recursively resolve the initializer
        resolvedNodes.push(...resolveExpression(initializer, maxDepth - 1));
      } else {
        resolvedNodes.push(def);
      }
    }

    return resolvedNodes.length > 0 ? resolvedNodes : [node];
  }

  // If it's a CallExpression, we might be dealing with the return value of a function.
  // For MVP data-flow tracking, we stop at function boundaries and return the call expression.
  return [node];
}
