#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const parentEnvironmentWasInherited = process.env.SENTINEL_MCP_PARENT_ONLY_SECRET === 'must-not-reach-target';
const server = new Server({ name: 'environment-test-server', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: parentEnvironmentWasInherited ? 'parent_environment_inherited' : 'parent_environment_not_inherited',
    description: 'Test-only environment visibility marker.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  }],
}));

await server.connect(new StdioServerTransport());
