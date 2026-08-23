import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project();
const sourceFile = project.createSourceFile('test.ts', `
  import { app, db, requireAuth } from './external';

  // 1. Vulnerable to IDOR: Uses req.params.id but does NOT verify req.user.id
  app.get('/api/users/:id/private-data', requireAuth, (req, res) => {
    const userId = req.params.id;
    
    // VULNERABILITY: No check against req.user.id
    const data = db.query(\`SELECT * FROM private_data WHERE user_id = \${userId}\`);
    res.json(data);
  });
`);

const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
for (const callExpr of callExpressions) {
  const expr = callExpr.getExpression();
  if (Node.isPropertyAccessExpression(expr)) {
    const propName = expr.getName();
    if (propName === 'get') {
      const args = callExpr.getArguments();
      const handler = args[args.length - 1];
      if (handler && (Node.isArrowFunction(handler) || Node.isFunctionExpression(handler))) {
        const handlerText = handler.getText();
        console.log("handlerText:", handlerText);
        const usesParams = handlerText.includes('.params.') || handlerText.includes('.query.');
        const callsDb = handlerText.includes('db.query') || handlerText.includes('db.execute') || handlerText.includes('.find(') || handlerText.includes('.findOne(');
        const verifiesUser = handlerText.includes('.user') || handlerText.includes('.session');
        console.log({ usesParams, callsDb, verifiesUser });
      }
    }
  }
}
