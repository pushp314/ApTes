const express = require('express');
const router = express.Router();
const mcpClient = require('mcp-client');

const client = mcpClient.connect('http://localhost:8080');

// Vulnerable: Missing auth middleware AND exposes MCP client directly to frontend
router.post('/api/chat', (req, res) => {
  const result = client.callTool('execute_query', req.body);
  res.send(result);
});

module.exports = router;
