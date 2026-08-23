/**
 * Test Server
 * 
 * A simple HTTP server to serve test fixtures for the Web Engine.
 * Serves a page with deliberate errors (console errors, 404s, 500s)
 * to verify the rules detect them correctly.
 */

import * as http from 'node:http';

const PORT = 3456;

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Fixture</title>
</head>
<body>
  <h1>Web Engine Test Fixture</h1>
  
  <!-- This script will trigger a 404 -->
  <script src="/does-not-exist.js"></script>

  <!-- Known-vendor widget URL exercises production widget heuristics. -->
  <script src="/assets/botpress-webchat.js"></script>
  
  <!-- This script will trigger a console error -->
  <script>
    console.error('This is a deliberate console error for testing');
    
    // Uncaught exception
    setTimeout(() => {
      throw new Error('This is a deliberate uncaught exception');
    }, 100);
  </script>
  
  <!-- This image will trigger a 500 -->
  <img src="/server-error-image.png" alt="Broken image" />

  <!-- Link for crawler to discover -->
  <a href="/page2">Go to Page 2</a>

  <!-- Phase 19: DOM Context Correlation Widget -->
  <div id="ai-chat-widget" data-testid="chat-bot" style="position: fixed; bottom: 10px; right: 10px;">
    <input type="text" id="chat-input" />
    <button id="chat-submit" onclick="fetch('/api/mock-chat', { method: 'POST', body: document.getElementById('chat-input').value })">Send</button>
  </div>
</body>
</html>
`;

const HTML_PAGE2 = `
<!DOCTYPE html>
<html>
<head>
  <!-- Missing title -->
</head>
<body>
  <!-- Missing H1 -->
  <h2>Page 2 - Functional Errors</h2>

  <!-- Form with no action, no submit button, and unnamed inputs -->
  <form id="bad-form">
    <input type="text" /> <!-- missing name -->
    <input type="password" /> <!-- missing name -->
    <!-- missing submit button -->
  </form>
</body>
</html>
`;

export function startTestServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
      } else if (req.url === '/page2') {
        // Set an insecure cookie for Phase 11 testing (missing HttpOnly, missing SameSite)
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Set-Cookie': 'insecure_session=123456789'
        });
        res.end(HTML_PAGE2);
      } else if (req.url === '/server-error-image.png') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else if (req.url === '/assets/botpress-webchat.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// Fixture-only placeholder for a known chat-widget asset.');
      } else if (req.url === '/api/mock-chat' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response: 'Mock AI response' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

export function stopTestServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTestServer().then(() => {
    // eslint-disable-next-line no-console
    console.log(`Test server running at http://127.0.0.1:${PORT}`);
  });
}
