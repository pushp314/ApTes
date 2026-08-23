const Parser = require('tree-sitter');
const Python = require('tree-sitter-python');

const parser = new Parser();
parser.setLanguage(Python);

const sourceCode = `
def foo():
    print("hello world")
`;

const tree = parser.parse(sourceCode);
console.log(tree.rootNode.toString());
