/**
 * Sentinel Unified Mission Control Web Dashboard Server
 * State-of-the-art Cyber-Security & Pentest Command Center GUI
 */

import http from 'node:http';
import url from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSecurityHeaders, inspectJwtToken } from './pentest/security-tools.js';
import { probeRouteAccessControls } from './pentest/auth-audit.js';

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Mission Control | Cyber Defense Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --panel: #0d121d;
      --card-bg: rgba(16, 23, 38, 0.85);
      --card-border: rgba(56, 189, 248, 0.18);
      --card-hover: rgba(56, 189, 248, 0.3);
      --accent: #00f0ff;
      --accent-dim: rgba(0, 240, 255, 0.15);
      --accent-glow: rgba(0, 240, 255, 0.35);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --danger: #ff3366;
      --danger-bg: rgba(255, 51, 102, 0.12);
      --warning: #ffb800;
      --warning-bg: rgba(255, 184, 0, 0.12);
      --success: #00e699;
      --success-bg: rgba(0, 230, 153, 0.12);
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
        radial-gradient(circle at 15% 15%, rgba(0, 240, 255, 0.06) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.08) 0%, transparent 45%),
        linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
    }
    header {
      padding: 1.25rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: rgba(7, 9, 14, 0.85);
      backdrop-filter: blur(20px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .brand-logo {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #fff 30%, var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .tag {
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--card-border);
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: var(--text-muted);
      background: rgba(255,255,255,0.03);
      padding: 0.35rem 0.8rem;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
    }
    main {
      flex: 1;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 2.5rem;
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 1.75rem;
      backdrop-filter: blur(24px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      position: relative;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .tools-nav {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
    }
    .tool-btn {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      color: var(--text-muted);
      padding: 0.85rem 1.1rem;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      font-weight: 600;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tool-btn:hover {
      background: rgba(0, 240, 255, 0.05);
      color: #fff;
      border-color: var(--card-hover);
      transform: translateX(4px);
    }
    .tool-btn.active {
      background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(99, 102, 241, 0.15));
      color: var(--accent);
      border-color: var(--accent);
      font-weight: 700;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.2);
    }
    .input-section {
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .form-group { margin-bottom: 1rem; }
    .form-group:last-child { margin-bottom: 0; }
    label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    input, textarea {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.92rem;
      transition: all 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(0, 240, 255, 0.03);
      box-shadow: 0 0 15px var(--accent-glow);
    }
    .preset-tags {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .preset-tag {
      font-size: 0.7rem;
      background: rgba(255,255,255,0.05);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-muted);
      border: 1px solid transparent;
    }
    .preset-tag:hover {
      color: var(--accent);
      border-color: var(--accent);
    }
    button.exec-btn {
      width: 100%;
      background: linear-gradient(135deg, #00f0ff, #7000ff);
      border: none;
      color: #fff;
      font-weight: 800;
      font-size: 0.98rem;
      padding: 0.95rem;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      transition: all 0.2s;
      box-shadow: 0 10px 25px rgba(0, 240, 255, 0.25);
    }
    button.exec-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 35px rgba(0, 240, 255, 0.4);
    }
    button.exec-btn:active { transform: translateY(0); }
    
    /* Output View */
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .metric-pill {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 1rem;
      text-align: center;
    }
    .metric-pill .num {
      font-size: 1.5rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
    }
    .metric-pill .lbl {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 0.2rem;
    }
    .findings-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 480px;
      max-height: 680px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }
    .finding-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 1.25rem;
      transition: all 0.2s;
    }
    .finding-card:hover {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.035);
    }
    .finding-card.critical { border-left: 4px solid var(--danger); background: var(--danger-bg); }
    .finding-card.high { border-left: 4px solid var(--danger); }
    .finding-card.medium { border-left: 4px solid var(--warning); }
    .finding-card.safe { border-left: 4px solid var(--success); }
    
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .severity-badge {
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }
    .severity-badge.critical { background: var(--danger); color: #fff; }
    .severity-badge.high { background: rgba(255, 51, 102, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .severity-badge.medium { background: rgba(255, 184, 0, 0.2); color: var(--warning); border: 1px solid var(--warning); }
    .severity-badge.safe { background: rgba(0, 230, 153, 0.2); color: var(--success); border: 1px solid var(--success); }

    .finding-title { font-weight: 700; font-size: 0.95rem; color: #fff; }
    .finding-desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-top: 0.4rem; }
    .remediation-box {
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      margin-top: 0.75rem;
      font-size: 0.8rem;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
    }
    .raw-json-box {
      background: #040711;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      height: 480px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #38bdf8;
      display: none;
    }
    .pulse-scan {
      display: none;
      align-items: center;
      gap: 0.75rem;
      background: var(--accent-dim);
      border: 1px solid var(--accent);
      padding: 1rem;
      border-radius: 12px;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 1rem;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-logo">
        <span>🛡️ SENTINEL</span>
      </div>
      <span class="tag">Mission Control v0.1</span>
    </div>
    <div class="header-actions">
      <div class="status-indicator">
        <span class="dot"></span>
        <span>Engines Online (AST / DAST / Python)</span>
      </div>
    </div>
  </header>

  <main>
    <!-- Left Navigation Column -->
    <div class="card">
      <div class="card-title">
        <span>Security Toolkits</span>
        <span style="font-size: 0.75rem; color: var(--accent);">7 Active Modules</span>
      </div>

      <div class="tools-nav">
        <button class="tool-btn active" onclick="selectTool('endpoints')">
          <span>🔍</span> <span>API Discovery & Recon</span>
        </button>
        <button class="tool-btn" onclick="selectTool('headers')">
          <span>🛡️</span> <span>HTTP Security Headers</span>
        </button>
        <button class="tool-btn" onclick="selectTool('jwt')">
          <span>🔑</span> <span>JWT Forensic Inspector</span>
        </button>
        <button class="tool-btn" onclick="selectTool('auth')">
          <span>🔓</span> <span>Auth Bypass & IDOR Prober</span>
        </button>
        <button class="tool-btn" onclick="selectTool('cors')">
          <span>🌐</span> <span>CORS Origin & Leakage</span>
        </button>
        <button class="tool-btn" onclick="selectTool('redirect')">
          <span>🔀</span> <span>Open Redirect Scanner</span>
        </button>
        <button class="tool-btn" onclick="selectTool('cookies')">
          <span>🍪</span> <span>Cookie & CSRF Auditor</span>
        </button>
      </div>

      <div class="input-section">
        <div class="form-group" id="url-group">
          <label>Target Web URL</label>
          <input type="text" id="target-url" placeholder="https://example.com" value="https://example.com">
          <div class="preset-tags">
            <span class="preset-tag" onclick="setUrl('https://example.com')">example.com</span>
            <span class="preset-tag" onclick="setUrl('http://localhost:3000')">localhost:3000</span>
            <span class="preset-tag" onclick="setUrl('http://localhost:8000')">localhost:8000</span>
          </div>
        </div>

        <div class="form-group" id="jwt-group" style="display: none;">
          <label>JWT Token String</label>
          <textarea id="jwt-token" rows="4" placeholder="eyJhbGciOiJIUzI1Ni..."></textarea>
          <div class="preset-tags">
            <span class="preset-tag" onclick="setSampleJwt()">Load Sample Insecure JWT</span>
          </div>
        </div>
      </div>

      <button class="exec-btn" onclick="runAudit()">
        <span>⚡ Run Diagnostic Audit</span>
      </button>
    </div>

    <!-- Right Content Column -->
    <div class="card" style="display: flex; flex-direction: column;">
      <div class="card-title">
        <span>Diagnostic Findings & Attack Surface</span>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="toggleView()" id="view-toggle-btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); padding: 0.25rem 0.65rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">Switch to Raw JSON</button>
        </div>
      </div>

      <!-- Realtime Progress Pulse -->
      <div class="pulse-scan" id="pulse-box">
        <span>📡</span> <span>Probing target and evaluating security boundaries...</span>
      </div>

      <!-- Metrics Scorecard -->
      <div class="metrics-bar">
        <div class="metric-pill">
          <div class="num" id="m-total" style="color: var(--accent);">0</div>
          <div class="lbl">Endpoints Found</div>
        </div>
        <div class="metric-pill">
          <div class="num" id="m-critical" style="color: var(--danger);">0</div>
          <div class="lbl">Critical Vulnerabilities</div>
        </div>
        <div class="metric-pill">
          <div class="num" id="m-warnings" style="color: var(--warning);">0</div>
          <div class="lbl">Warnings / Missing</div>
        </div>
        <div class="metric-pill">
          <div class="num" id="m-status" style="color: var(--success);">READY</div>
          <div class="lbl">Engine Status</div>
        </div>
      </div>

      <!-- Structured Finding Cards -->
      <div class="findings-container" id="cards-container">
        <div class="finding-card safe">
          <div class="finding-header">
            <span class="finding-title">🚀 Sentinel Mission Control Ready</span>
            <span class="severity-badge safe">READY</span>
          </div>
          <div class="finding-desc">Select any security module on the left, enter your target URL or JWT token, and click "Run Diagnostic Audit" to begin inspection.</div>
        </div>
      </div>

      <!-- Raw JSON View -->
      <div class="raw-json-box" id="json-container"></div>
    </div>
  </main>

  <script>
    let activeTool = 'endpoints';
    let isRawView = false;
    let currentRawData = {};

    function setUrl(u) { document.getElementById('target-url').value = u; }
    function setSampleJwt() {
      document.getElementById('jwt-token').value = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJleHAiOjE1Nzc4MzY4MDB9.';
    }

    function selectTool(tool) {
      activeTool = tool;
      document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
      event.currentTarget.classList.add('active');

      if (tool === 'jwt') {
        document.getElementById('url-group').style.display = 'none';
        document.getElementById('jwt-group').style.display = 'block';
      } else {
        document.getElementById('url-group').style.display = 'block';
        document.getElementById('jwt-group').style.display = 'none';
      }
    }

    function toggleView() {
      isRawView = !isRawView;
      document.getElementById('view-toggle-btn').innerText = isRawView ? 'Switch to Card View' : 'Switch to Raw JSON';
      document.getElementById('cards-container').style.display = isRawView ? 'none' : 'flex';
      document.getElementById('json-container').style.display = isRawView ? 'block' : 'none';
    }

    async function runAudit() {
      const pulse = document.getElementById('pulse-box');
      const cards = document.getElementById('cards-container');
      const jsonBox = document.getElementById('json-container');
      const urlVal = document.getElementById('target-url').value;
      const jwtVal = document.getElementById('jwt-token').value;

      pulse.style.display = 'flex';
      document.getElementById('m-status').innerText = 'AUDITING';

      try {
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: activeTool, url: urlVal, token: jwtVal })
        });
        const data = await response.json();
        currentRawData = data;
        jsonBox.innerText = JSON.stringify(data, null, 2);
        renderCards(data);
      } catch (err) {
        cards.innerHTML = '<div class="finding-card critical"><div class="finding-title">❌ Audit Failed</div><div class="finding-desc">' + err.message + '</div></div>';
      } finally {
        pulse.style.display = 'none';
        document.getElementById('m-status').innerText = 'DONE';
      }
    }

    function renderCards(data) {
      const container = document.getElementById('cards-container');
      container.innerHTML = '';

      let total = 0, critical = 0, warnings = 0;

      if (activeTool === 'endpoints' && data.endpoints) {
        total = data.total_endpoints_found || data.endpoints.length;
        document.getElementById('m-total').innerText = total;
        
        let html = '<div class="finding-card safe"><div class="finding-header"><span class="finding-title">📊 Discovered ' + total + ' API Endpoints</span><span class="severity-badge safe">' + total + ' ROUTES</span></div><div class="finding-desc">';
        data.endpoints.forEach(ep => {
          html += '<div style="margin: 0.35rem 0; font-family: monospace; color: var(--accent);">⚡ ' + ep + '</div>';
        });
        html += '</div></div>';
        container.innerHTML = html;
      } else if (activeTool === 'headers') {
        warnings = data.missingHeaders ? data.missingHeaders.length : 0;
        document.getElementById('m-warnings').innerText = warnings;
        if (warnings > 0) {
          data.missingHeaders.forEach(h => {
            container.innerHTML += '<div class="finding-card medium"><div class="finding-header"><span class="finding-title">Missing Header: ' + h + '</span><span class="severity-badge medium">MEDIUM</span></div><div class="finding-desc">Browser is missing standard security protection for ' + h + '.</div><div class="remediation-box">👉 Add response header: ' + h + '</div></div>';
          });
        } else {
          container.innerHTML = '<div class="finding-card safe"><div class="finding-title">✅ All Critical Security Headers Present</div></div>';
        }
      } else if (activeTool === 'jwt') {
        if (data.warnings && data.warnings.length > 0) {
          critical = data.warnings.length;
          document.getElementById('m-critical').innerText = critical;
          data.warnings.forEach(w => {
            container.innerHTML += '<div class="finding-card critical"><div class="finding-header"><span class="finding-title">🚨 ' + (w.title || 'Insecure Token') + '</span><span class="severity-badge critical">CRITICAL</span></div><div class="finding-desc">' + (w.message || w) + '</div></div>';
          });
        } else {
          container.innerHTML = '<div class="finding-card safe"><div class="finding-title">✅ Valid JWT Token Structure</div><div class="finding-desc">Algorithm: ' + data.algorithm + '</div></div>';
        }
      } else if (data.findings && data.findings.length > 0) {
        critical = data.findings.length;
        document.getElementById('m-critical').innerText = critical;
        data.findings.forEach(f => {
          container.innerHTML += '<div class="finding-card critical"><div class="finding-header"><span class="finding-title">' + (f.title || 'Vulnerability Detected') + '</span><span class="severity-badge critical">' + (f.severity || 'CRITICAL') + '</span></div><div class="finding-desc">' + (f.message || JSON.stringify(f)) + '</div>' + (f.remediation ? '<div class="remediation-box">👉 Fix: ' + f.remediation + '</div>' : '') + '</div>';
        });
      } else {
        container.innerHTML = '<div class="finding-card safe"><div class="finding-title">✅ No Vulnerabilities Detected</div><div class="finding-desc">The target satisfied all security checks for this test.</div></div>';
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
              const currentDir = path.dirname(fileURLToPath(import.meta.url));
              const pythonScript = path.resolve(currentDir, '../../sentinel-py/sentinel.py');

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
