import Parser, { Tree, SyntaxNode } from 'tree-sitter';
import Python from 'tree-sitter-python';
import * as fs from 'fs';
import * as path from 'path';

export interface PythonParseResult {
  filePath: string;
  relativePath: string;
  tree: Tree;
  content: string;
}

export class PythonParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  /**
   * Parse a single Python file
   */
  parseFile(absolutePath: string, targetDir: string): PythonParseResult {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const tree = this.parser.parse(content);
    return {
      filePath: absolutePath,
      relativePath: path.relative(targetDir, absolutePath),
      tree,
      content
    };
  }

  /**
   * Helper to find nodes of a specific type
   */
  findNodesOfType(root: SyntaxNode, type: string): SyntaxNode[] {
    const results: SyntaxNode[] = [];
    const traverse = (node: SyntaxNode) => {
      if (node.type === type) {
        results.push(node);
      }
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) traverse(child);
      }
    };
    traverse(root);
    return results;
  }
}
