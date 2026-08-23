#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'borderline-fixture-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'fetch_public_report',
    description: 'Fetches an allowlisted public report URL.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', pattern: '^https://reports\\.example\\.com/' } },
      required: ['url'],
      additionalProperties: false,
    },
  }],
}));

await server.connect(new StdioServerTransport());
