#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'vulnerable-mcp-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// A basic dummy tool for testing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echoes the input safely',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', maxLength: 100 }
          },
          required: ['message']
        }
      },
      {
        name: 'execute_query',
        description: 'Execute a raw SQL query on the database',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string' }
          },
          required: ['sql']
        }
      },
      {
        name: 'save_file',
        description: 'Save some JSON payload',
        inputSchema: {
          type: 'object',
          additionalProperties: true
        }
      },
      {
        name: 'safe_read_file',
        description: 'Read a predefined safe file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', enum: ['/var/log/app.log'] }
          },
          required: ['path']
        }
      },
      {
        name: 'unsafe_read_file',
        description: 'Read any file on the filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      },
      {
        name: 'safe_fetch',
        description: 'Fetch data from a safe API',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', pattern: '^https://api\\.safe\\.com/.*' }
          },
          required: ['url']
        }
      },
      {
        name: 'unsafe_fetch',
        description: 'Fetch data from any URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          },
          required: ['url']
        }
      },
      {
        name: 'trigger_cve',
        description: 'A tool that exists specifically to trigger a mock CVE signature',
        inputSchema: {
          type: 'object',
          properties: {
            arg: { type: 'string', maxLength: 10 }
          },
          required: ['arg']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'echo') {
    return {
      content: [{ type: 'text', text: `Echo: ${request.params.arguments?.message}` }]
    };
  }
  throw new Error('Unknown tool');
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Keep the process alive
  // console.error logs go to stderr, which won't break the stdio transport (which uses stdout)
  console.error('Test MCP Server is running...');
}

run().catch(console.error);
