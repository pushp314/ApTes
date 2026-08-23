#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({ name: 'safe-fixture-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'get_status',
    description: 'Returns the current public service status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  }],
}));

await server.connect(new StdioServerTransport());
