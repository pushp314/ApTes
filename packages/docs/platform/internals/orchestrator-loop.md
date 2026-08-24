# Orchestrator Event Loop

The `Platform Orchestrator` is the central brain of Sentinel. It is responsible for dispatching the engines concurrently, aggregating their results, and synthesizing the final attack path.

## The Concurrency Model

Sentinel maximizes speed by running I/O-bound (Web/Playwright) and CPU-bound (Code/AST) tasks simultaneously using Node.js's asynchronous event loop.

```typescript
const [codeResults, webResults, mcpResults] = await Promise.allSettled([
  ruleEngine.analyze(codeContext),
  webEngine.crawl(webContext),
  mcpEngine.introspect(mcpContext)
]);
```

By using `Promise.allSettled`, the Orchestrator ensures that if one engine fails (e.g., the web server goes offline and Playwright crashes), the other engines can still successfully report their findings.

## Correlation Graph Matching

Once the findings are aggregated, the Orchestrator builds a bipartite graph.

1. **Nodes** represent vulnerabilities found by a specific engine.
2. **Edges** represent logical connections (e.g., "SQLi found in Backend AST" connects to "SQLi confirmed via Frontend form input").

If a finding has no edges (e.g., the AST found an SQLi, but the Web Engine couldn't trigger it because there is a WAF blocking the input), the finding is downgraded to `LOW` confidence. If edges exist, it is upgraded to a `CRITICAL` confirmed attack path.
