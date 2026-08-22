import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runUnifiedPlatform } from './orchestrator.js';
import * as http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3457;

const HTML_WIDGET = `
<!DOCTYPE html>
<html>
<head>
  <title>Platform Test Fixture</title>
</head>
<body>
  <h1>Unified Platform Test</h1>
  <div data-mcp-target="vulnerable-mcp-server">Chat Widget</div>
</body>
</html>
`;

let testServer: http.Server;

describe('Unified Platform Orchestrator', () => {
  beforeAll(async () => {
    testServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(HTML_WIDGET);
    });
    
    await new Promise<void>((resolve) => {
      testServer.listen(PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      testServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it('runs both engines and correlates a vulnerable MCP agent connected to the web frontend', async () => {
    // The dummy mcp server is located in the mcp package test fixtures
    const mcpTestServerPath = path.resolve(__dirname, '../../mcp/src/test-server.js');

    const project = {
      id: 'platform-test',
      webUrl: `http://127.0.0.1:${PORT}`,
      mcpTargets: [
        {
          command: 'node',
          args: [mcpTestServerPath]
        }
      ]
    };

    const report = await runUnifiedPlatform(project, 20000);

    if (report.errors.length > 0) {
      throw new Error('Errors occurred: ' + report.errors.join(', '));
    }
    expect(report.errors).toHaveLength(0);
    expect(report.findings.length).toBeGreaterThan(0);

    // 1. Verify Web Engine ran and found the widget
    const webWidgetFinding = report.findings.find(f => f.ruleId === 'web-ai-widget');
    expect(webWidgetFinding).toBeDefined();
    expect(webWidgetFinding?.engine).toBe('web');
    expect(webWidgetFinding?.evidence?.targetName).toBe('vulnerable-mcp-server');

    // 2. Verify MCP Engine ran and found vulnerabilities
    const mcpCriticalFindings = report.findings.filter(f => f.engine === 'mcp' && f.severity === 'critical');
    expect(mcpCriticalFindings.length).toBeGreaterThan(0);

    // 3. Verify Correlation Logic generated the final correlated finding
    const correlationFinding = report.findings.find(f => f.ruleId === 'platform-mcp-exposure');
    expect(correlationFinding).toBeDefined();
    expect(correlationFinding?.category).toBe('correlation');
    expect(correlationFinding?.severity).toBe('critical');
    expect(correlationFinding?.message).toContain('vulnerable-mcp-server');
    expect(correlationFinding?.evidence?.webFindingId).toBe(webWidgetFinding?.id);
    
    // Check that we properly mapped the MCP findings
    const mcpFindingIds = (correlationFinding?.evidence?.mcpFindingIds as string[]) || [];
    expect(mcpFindingIds.length).toBeGreaterThan(0);
    if (mcpCriticalFindings.length > 0) {
      expect(mcpFindingIds.includes(mcpCriticalFindings[0]!.id)).toBe(true);
    }
  }, 30000);
});
