# Custom Rules API Tutorial

Sentinel's deterministic engines are highly extensible. While the platform ships with 15+ built-in rules, you can easily write your own custom rules by implementing the `EngineRule` interface.

This tutorial will walk you through creating a custom static analysis rule for CodeSentinel.

## 1. The `EngineRule` Interface

Every rule in Sentinel implements a strict contract:

```typescript
import type { EngineRule, EngineContext, Finding } from '@sentinel/shared';

export const NoConsoleLogRule: EngineRule = {
  id: 'no-console-log',
  name: 'No Console Log',
  description: 'Prevents console.log from being committed to production code.',
  severity: 'LOW',
  confidence: 'HIGH',
  analyze: async (context: EngineContext): Promise<Finding[]> => {
    // Rule implementation goes here
    return [];
  }
};
```

## 2. Using the `EngineContext`

The `EngineContext` provides you with a rich set of utilities depending on which engine is running. For CodeSentinel, it provides full access to the `ts-morph` AST.

Let's implement our logic:

```typescript
analyze: async (context: EngineContext): Promise<Finding[]> => {
  const findings: Finding[] = [];
  
  // 1. Ensure we are in a code analysis context
  if (context.type !== 'code' || !context.codeContext) return [];
  
  // 2. Iterate through all parsed files
  for (const sourceFile of context.codeContext.project.getSourceFiles()) {
    
    // 3. Search the AST for CallExpressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const callExpr of callExpressions) {
      const expressionText = callExpr.getExpression().getText();
      
      if (expressionText === 'console.log') {
        findings.push({
          id: \`finding-\${Date.now()}\`,
          ruleId: 'no-console-log',
          severity: 'LOW',
          confidence: 'HIGH',
          title: 'Leftover console.log',
          description: 'A console.log statement was found. Remove before production.',
          remediation: 'Remove the console.log statement.',
          location: {
            file: sourceFile.getFilePath(),
            line: callExpr.getStartLineNumber()
          }
        });
      }
    }
  }
  
  return findings;
}
```

## 3. Registering the Rule

Once your rule is written, simply register it with the CodeSentinel rule engine:

```typescript
import { ruleEngine } from '@sentinel/codesentinel';
import { NoConsoleLogRule } from './rules/no-console-log';

ruleEngine.register(NoConsoleLogRule);
```

## What's Next?

This was a simple regex-like AST rule. However, Sentinel supports full **Data-Flow Taint Tracking**. 

For advanced tutorials on using `context.dataFlow` to trace inputs to sinks, refer to the [Shared Models](./shared/src/README.md) documentation!
