/**
 * Sentinel Unified Mission Control Web Dashboard Server
 * Provides a local single-page web GUI to trigger scans, test API endpoints, and view vulnerabilities.
 */

import http from 'node:http';
import url from 'node:url';
import { auditSecurityHeaders, inspectJwtToken } from './pentest/security-tools.js';
import { probeRouteAccessControls } from './pentest/auth-audit.js';

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Mission Control | Security Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 26, 44, 0.7);
      --card-border: rgba(56, 189, 248, 0.15);
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.25);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --danger: #f43f5e;
      --warning: #fbbf24;
      --success: #34d399;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 40%);
    }
    header {
      padding: 1.5rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .badge {
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border: 1px solid var(--card-border);
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    main {
      flex: 1;
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
      padding: 2.5rem;
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h2 { font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem; color: #fff; }
    .tool-tab {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    button.tab-btn {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      color: var(--text-muted);
      padding: 0.75rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.2s;
    }
    button.tab-btn:hover {
      background: rgba(56, 189, 248, 0.08);
      color: #fff;
      border-color: var(--accent);
    }
    button.tab-btn.active {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
      font-weight: 700;
      box-shadow: 0 0 20px var(--accent-glow);
    }
    .input-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input, textarea {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.95rem;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 10px var(--accent-glow);
    }
    button.run-btn {
      width: 100%;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      border: none;
      color: #050b14;
      font-weight: 800;
      font-size: 1rem;
      padding: 0.85rem;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    button.run-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(56, 189, 248, 0.4);
    }
    .console-box {
      background: #040711;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      min-height: 450px;
      max-height: 650px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #38bdf8;
    }
    .status-pill {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      margin-right: 6px;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <span>🛡️ Sentinel</span>
      <span class="badge">Mission Control GUI</span>
    </div>
    <div>
      <span class="status-pill"></span>
      <span style="font-size: 0.85rem; color: var(--text-muted);">Engine Ready</span>
    </div>
  </header>

  <main>
    <!-- Left Navigation / Control Column -->
    <div class="card">
      <h2>Select Security Tool</h2>
      <div class="tool-tab">
        <button class="tab-btn active" onclick="setTool('endpoints')">🔍 API Endpoint Discovery</button>
        <button class="tab-btn" onclick="setTool('headers')">🛡️ HTTP Security Headers</button>
        <button class="tab-btn" onclick="setTool('jwt')">🔑 JWT Security Inspector</button>
        <button class="tab-btn" onclick="setTool('auth')">🔓 Auth Bypass Prober</button>
        <button class="tab-btn" onclick="setTool('cors')">🌐 CORS Vulnerability Prober</button>
        <button class="tab-btn" onclick="setTool('redirect')">🔀 Open Redirect Prober</button>
        <button class="tab-btn" onclick="setTool('cookies')">🍪 Cookie & CSRF Auditor</button>
      </div>

      <div id="dynamic-inputs">
        <div class="input-group" id="url-group">
          <label>Target URL</label>
          <input type="text" id="target-url" placeholder="https://example.com" value="https://example.com">
        </div>
        <div class="input-group" id="jwt-group" style="display: none;">
          <label>JWT Token String</label>
          <textarea id="jwt-token" rows="4" placeholder="eyJhbGciOiJIUzI1Ni..."></textarea>
        </div>
      </div>

      <button class="run-btn" id="run-btn" onclick="executeTool()">
        <span>⚡ Launch Audit</span>
      </button>
    </div>

    <!-- Right Results Column -->
    <div class="card" style="display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2>Diagnostic Output & Findings</h2>
        <button onclick="clearConsole()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;">Clear Screen</button>
      </div>
      <div class="console-box" id="output-box">🚀 Sentinel Mission Control is active.
Select a tool on the left and click "Launch Audit" to test your application.</div>
    </div>
  </main>

  <script>
    let currentTool = 'endpoints';

    function setTool(tool) {
      currentTool = tool;
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      event.currentTarget.classList.add('active');

      if (tool === 'jwt') {
        document.getElementById('url-group').style.display = 'none';
        document.getElementById('jwt-group').style.display = 'block';
      } else {
        document.getElementById('url-group').style.display = 'block';
        document.getElementById('jwt-group').style.display = 'none';
      }
    }

    function clearConsole() {
      document.getElementById('output-box').innerText = '';
    }

    async function executeTool() {
      const out = document.getElementById('output-box');
      const urlVal = document.getElementById('target-url').value;
      const jwtVal = document.getElementById('jwt-token').value;

      out.innerText = '⏳ Executing ' + currentTool + ' scan against target...\\n';

      try {
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: currentTool, url: urlVal, token: jwtVal })
        });
        const data = await response.json();
        out.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        out.innerText = '❌ Error executing tool: ' + err.message;
      }
    }
  </script>
</body>
</html>`;

export function startDashboardServer(port = 3333): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url || '', true);

      if (req.method === 'GET' && (parsed.pathname === '/' || parsed.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML_PAGE);
        return;
      }

      if (req.method === 'POST' && parsed.pathname === '/api/run') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const tool = payload.tool;
            const targetUrl = payload.url || 'https://example.com';
            let result: any = {};

            if (tool === 'headers') {
              result = await auditSecurityHeaders(targetUrl);
            } else if (tool === 'jwt') {
              result = inspectJwtToken(payload.token || '');
            } else if (tool === 'auth') {
              result = await probeRouteAccessControls(
                [{ route: '/api/admin' }, { route: '/api/users' }, { route: '/api/billing' }],
                { baseUrl: targetUrl },
                'dashboard-probe'
              );
            } else {
              // Run via Python standalone tools for endpoints, cors, redirect, cookies
              const { execFile } = await import('node:child_process');
              const { promisify } = await import('node:util');
              const exec = promisify(execFile);
              const pythonScript = new URL('../../../packages/sentinel-py/sentinel.py', import.meta.url).pathname;

              const pyArgs = [pythonScript, tool, targetUrl];
              const { stdout } = await exec('python3', pyArgs);
              try {
                result = JSON.parse(stdout);
              } catch {
                result = { raw_output: stdout };
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result, null, 2));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.listen(port, () => {
      resolve(port);
    });

    server.on('error', err => reject(err));
  });
}
