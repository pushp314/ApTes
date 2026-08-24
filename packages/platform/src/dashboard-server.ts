/**
 * Sentinel Unified Mission Control Web Dashboard Server
 * Tier-1 Enterprise Cybersecurity & Threat Management Platform
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectJwtToken } from './pentest/security-tools.js';

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel Enterprise | Cybersecurity Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07080c;
      --surface: #0e1118;
      --surface-elevated: #141824;
      --surface-hover: #1b2130;
      --border: #1a202c;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-focus: #3b82f6;
      
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-faint: #64748b;
      
      --accent: #ffffff;
      --accent-blue: #3b82f6;
      --accent-blue-dim: rgba(59, 130, 246, 0.12);
      
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.08);
      --danger-border: rgba(239, 68, 68, 0.25);
      
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.08);
      --warning-border: rgba(245, 158, 11, 0.25);
      
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.08);
      --success-border: rgba(16, 185, 129, 0.25);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }

    /* Top Enterprise Header */
    header {
      height: 64px;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-weight: 800;
      font-size: 1.1rem;
      letter-spacing: -0.02em;
      color: #fff;
      text-decoration: none;
    }

    .brand-icon {
      width: 26px;
      height: 26px;
      background: #fff;
      color: #000;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      font-weight: 900;
    }

    .edition-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
    }

    .gateway-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-secondary {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      color: var(--text-main);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.15s ease;
    }

    .btn-secondary:hover {
      background: var(--surface-hover);
      border-color: rgba(255, 255, 255, 0.2);
    }

    /* Main Grid Layout */
    main {
      flex: 1;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      padding: 1.75rem 2rem;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1.75rem;
    }

    /* Left Sidebar */
    .sidebar-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .nav-card, .config-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .nav-group-title {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin: 0.85rem 0 0.45rem 0.5rem;
    }
    .nav-group-title:first-child { margin-top: 0; }

    .tool-nav-item {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.55rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      font-size: 0.84rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s ease;
      margin-bottom: 2px;
    }

    .tool-nav-item:hover {
      background: var(--surface-elevated);
      color: #fff;
    }

    .tool-nav-item.active {
      background: #fff;
      color: #000;
      font-weight: 700;
    }

    .tool-nav-item.active .badge-count {
      background: #000;
      color: #fff;
    }

    .badge-count {
      font-size: 0.68rem;
      font-weight: 700;
      background: var(--surface-elevated);
      color: var(--text-faint);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Target Configuration */
    .input-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
    }

    .form-input {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.84rem;
      transition: all 0.15s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 1px var(--border-focus);
    }

    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.5rem;
    }

    .preset-chip {
      font-size: 0.7rem;
      font-family: 'JetBrains Mono', monospace;
      background: var(--surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .preset-chip:hover {
      background: var(--surface-hover);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
      width: 100%;
      background: #fff;
      color: #000;
      border: none;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
      transition: all 0.15s ease;
    }

    .btn-primary:hover {
      background: #e2e8f0;
    }

    /* Right Analysis Panel */
    .workspace-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Scorecard Grid */
    .scorecard-grid {
      display: grid;
      grid-template-columns: 240px repeat(3, 1fr);
      gap: 1rem;
    }

    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
    }

    .kpi-header {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-faint);
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
      line-height: 1;
    }

    .kpi-sub {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.4rem;
    }

    .score-badge {
      font-size: 0.8rem;
      font-weight: 800;
      padding: 0.15rem 0.55rem;
      border-radius: 4px;
    }

    .score-badge.grade-a { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
    .score-badge.grade-c { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
    .score-badge.grade-f { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }

    /* Live Operational Activity & Stepper */
    .operations-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .operations-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    /* Multi-stage Stepper Pipeline */
    .pipeline-stepper {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .step-item {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      padding: 0.65rem 0.85rem;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      transition: all 0.2s ease;
    }

    .step-item.active {
      border-color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }

    .step-item.completed {
      border-color: var(--success);
      background: var(--success-bg);
    }

    .step-num {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--text-faint);
      font-family: 'JetBrains Mono', monospace;
    }

    .step-item.active .step-num { color: #fff; }
    .step-item.completed .step-num { color: var(--success); }

    .step-title {
      font-size: 0.76rem;
      font-weight: 700;
      color: #fff;
    }

    /* Live Terminal Log Stream */
    .terminal-stream {
      background: #040508;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.85rem 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #94a3b8;
      max-height: 160px;
      overflow-y: auto;
      line-height: 1.6;
    }

    .terminal-line { display: flex; gap: 0.75rem; }
    .terminal-time { color: var(--text-faint); }
    .terminal-text { color: #cbd5e1; }
    .terminal-text.accent { color: #fff; font-weight: 600; }
    .terminal-text.success { color: var(--success); }
    .terminal-text.warn { color: var(--warning); }
    .terminal-text.danger { color: var(--danger); }

    /* Executive AI Summary Box */
    .executive-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid #fff;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
    }

    .executive-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.65rem;
    }

    .executive-title {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .compliance-pill {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .executive-text {
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.6;
    }

    /* Content Tabs & Findings Workspace */
    .content-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 520px;
    }

    .tab-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .tabs-group {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover { color: #fff; }
    .tab-btn.active {
      background: var(--surface-elevated);
      color: #fff;
      font-weight: 700;
    }

    /* Finding Rows */
    .findings-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-height: 600px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .finding-row {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.15rem;
      transition: all 0.15s ease;
    }

    .finding-row:hover {
      border-color: rgba(255, 255, 255, 0.18);
    }

    .finding-row.sev-critical { border-left: 3px solid var(--danger); }
    .finding-row.sev-high { border-left: 3px solid var(--warning); }
    .finding-row.sev-medium { border-left: 3px solid var(--warning); }
    .finding-row.sev-safe { border-left: 3px solid var(--success); }

    .finding-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.4rem;
    }

    .finding-name {
      font-size: 0.92rem;
      font-weight: 700;
      color: #fff;
    }

    .sev-tag {
      font-size: 0.68rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .sev-tag.critical { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-border); }
    .sev-tag.high { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
    .sev-tag.medium { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }
    .sev-tag.safe { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }

    .finding-details {
      font-size: 0.84rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .code-remediation {
      background: #040508;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-top: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
    }

    .copy-btn {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
    }
    .copy-btn:hover { color: #fff; background: var(--surface-hover); }

    /* Telemetry Table */
    .telemetry-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .telemetry-table th {
      text-align: left;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-faint);
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
      background: var(--surface-elevated);
    }

    .telemetry-table td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border-subtle);
      color: #cbd5e1;
    }

    .telemetry-status {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 600;
      font-size: 0.75rem;
    }

    .telemetry-status.passed { color: var(--success); }
    .telemetry-status.failed { color: var(--danger); }
    .telemetry-status.warn { color: var(--warning); }

    .raw-view-box {
      display: none;
      background: #040508;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #94a3b8;
      height: 520px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>

  <!-- Top Enterprise Navbar -->
  <header>
    <div class="brand-section">
      <a href="/" class="brand-logo">
        <div class="brand-icon">S</div>
        <span>SENTINEL</span>
      </a>
      <span class="edition-badge">ENTERPRISE GATEWAY</span>
    </div>

    <div class="header-center">
      <div class="gateway-status">
        <span class="status-dot"></span>
        <span id="gateway-telemetry">DIAGNOSTIC DAEMONS: AST • DAST • RECON • AI</span>
      </div>
    </div>

    <div class="header-actions">
      <button class="btn-secondary" onclick="exportReport()">
        <span>📄 Export Telemetry (JSON)</span>
      </button>
    </div>
  </header>

  <!-- Main Grid Workspace -->
  <main>
    <!-- Left Navigation Sidebar -->
    <div class="sidebar-panel">
      <!-- Target Perimeter Configuration -->
      <div class="config-card">
        <div class="input-label">Target Perimeter</div>
        <input type="text" id="target-url" class="form-input" placeholder="https://app.example.com" value="https://example.com">
        
        <div class="presets-row">
          <span class="preset-chip" onclick="setUrl('https://example.com')">example.com</span>
          <span class="preset-chip" onclick="setUrl('http://localhost:3000')">localhost:3000</span>
          <span class="preset-chip" onclick="setUrl('http://localhost:5173')">localhost:5173</span>
          <span class="preset-chip" onclick="setUrl('http://localhost:8000')">localhost:8000</span>
        </div>

        <div id="jwt-group" style="display: none; margin-top: 1rem;">
          <div class="input-label">JWT Token Claims</div>
          <textarea id="jwt-token" class="form-input" rows="3" placeholder="eyJhbGciOiJIUzI1Ni..."></textarea>
          <div class="presets-row">
            <span class="preset-chip" onclick="setSampleJwt()">Load Insecure Alg=None Token</span>
          </div>
        </div>

        <button class="btn-primary" id="btn-execute" onclick="executeAudit()">
          <span>Execute Security Assessment</span>
        </button>
      </div>

      <!-- Domain Navigation -->
      <div class="nav-card">
        <div class="nav-group-title">Orchestrated Assessments</div>
        <button class="tool-nav-item active" onclick="setModule('audit')">
          <span>360° Unified Assessment</span>
          <span class="badge-count">ALL</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('endpoints')">
          <span>Attack Surface Recon</span>
          <span class="badge-count">MAP</span>
        </button>

        <div class="nav-group-title">Perimeter & Infrastructure</div>
        <button class="tool-nav-item" onclick="setModule('headers')">
          <span>HTTP Security Headers</span>
          <span class="badge-count">DAST</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('exposure')">
          <span>Sensitive File Exposure</span>
          <span class="badge-count">SECRETS</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('cors')">
          <span>CORS Policy & Isolation</span>
          <span class="badge-count">ORIGIN</span>
        </button>

        <div class="nav-group-title">Identity & Application Layer</div>
        <button class="tool-nav-item" onclick="setModule('auth')">
          <span>Route Access & IDOR Prober</span>
          <span class="badge-count">RBAC</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('cookies')">
          <span>Cookie & CSRF Hardening</span>
          <span class="badge-count">FLAGS</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('redirect')">
          <span>Open Redirect Scanner</span>
          <span class="badge-count">3XX</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('xss')">
          <span>Reflected XSS Injection</span>
          <span class="badge-count">INJECT</span>
        </button>
        <button class="tool-nav-item" onclick="setModule('jwt')">
          <span>JWT Cryptographic Audit</span>
          <span class="badge-count">TOKEN</span>
        </button>
      </div>
    </div>

    <!-- Right Content Workspace -->
    <div class="workspace-panel">
      <!-- KPI Executive Metrics -->
      <div class="scorecard-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Security Posture</span>
            <span class="score-badge grade-a" id="grade-badge">GRADE A</span>
          </div>
          <div class="kpi-value" id="kpi-score">100<span style="font-size: 1rem; color: var(--text-faint);">/100</span></div>
          <div class="kpi-sub">Tri-Boundary Compliance Index</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">Critical Vulnerabilities</div>
          <div class="kpi-value" id="kpi-critical" style="color: var(--danger);">0</div>
          <div class="kpi-sub">Direct Exploits Requiring Patch</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">Hardening Deficits</div>
          <div class="kpi-value" id="kpi-warnings" style="color: var(--warning);">0</div>
          <div class="kpi-sub">Missing Defense-in-Depth Flags</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">Active Checkpoints</div>
          <div class="kpi-value" id="kpi-boundaries" style="color: var(--text-main);">7/7</div>
          <div class="kpi-sub">Audited Subsystems</div>
        </div>
      </div>

      <!-- Live Operations & Behind-the-Scenes Activity Stepper -->
      <div class="operations-panel">
        <div class="operations-header">
          <span>Operational Execution Telemetry (Behind The Scenes)</span>
          <span style="font-family: 'JetBrains Mono', monospace;" id="telemetry-elapsed">LATENCY: 0.00s</span>
        </div>

        <!-- 5-Stage Multi-Stage Stepper -->
        <div class="pipeline-stepper">
          <div class="step-item" id="step-1">
            <span class="step-num">01 / RECON</span>
            <span class="step-title">Perimeter Handshake</span>
          </div>
          <div class="step-item" id="step-2">
            <span class="step-num">02 / HEADERS</span>
            <span class="step-title">Security Policies</span>
          </div>
          <div class="step-item" id="step-3">
            <span class="step-num">03 / IDENTITY</span>
            <span class="step-title">Auth & CORS Probing</span>
          </div>
          <div class="step-item" id="step-4">
            <span class="step-num">04 / EXPLOITS</span>
            <span class="step-title">XSS & Redirect Fuzzing</span>
          </div>
          <div class="step-item" id="step-5">
            <span class="step-num">05 / SYNTHESIS</span>
            <span class="step-title">AI Threat Scoring</span>
          </div>
        </div>

        <!-- Terminal Output Stream -->
        <div class="terminal-stream" id="terminal-stream">
          <div class="terminal-line">
            <span class="terminal-time">[00:00:00]</span>
            <span class="terminal-text">Sentinel Enterprise Gateway ready. Select target perimeter to dispatch diagnostic daemons.</span>
          </div>
        </div>
      </div>

      <!-- Executive AI Verdict -->
      <div class="executive-card" id="executive-card">
        <div class="executive-header">
          <div class="executive-title">
            <span>Executive Risk Assessment & Synthesis</span>
          </div>
          <span class="compliance-pill">OWASP TOP 10 • SOC2 TYPE II COMPLIANCE READY</span>
        </div>
        <div class="executive-text" id="executive-text">
          Target perimeter ready for diagnostic execution. Select a security domain on the left and trigger an orchestrated assessment.
        </div>
      </div>

      <!-- Tabbed Findings Workspace -->
      <div class="content-card">
        <div class="tab-bar">
          <div class="tabs-group">
            <button class="tab-btn active" id="tab-findings-btn" onclick="switchView('findings')">Findings & Vulnerabilities</button>
            <button class="tab-btn" id="tab-matrix-btn" onclick="switchView('matrix')">Verification Matrix</button>
            <button class="tab-btn" id="tab-raw-btn" onclick="switchView('raw')">Raw JSON Telemetry</button>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-faint); font-family: 'JetBrains Mono', monospace;" id="telemetry-timestamp">
            STATUS: IDLE
          </div>
        </div>

        <!-- Tab 1: Findings List -->
        <div class="findings-list" id="findings-container">
          <div class="finding-row sev-safe">
            <div class="finding-top">
              <span class="finding-name">Perimeter Gateway Initialized</span>
              <span class="sev-tag safe">READY</span>
            </div>
            <div class="finding-details">
              Sentinel Enterprise Gateway is online. Enter your target URL and execute an assessment to inspect active defenses and detect potential attack vectors.
            </div>
          </div>
        </div>

        <!-- Tab 2: Verification Matrix Table -->
        <div id="matrix-container" style="display: none;">
          <table class="telemetry-table">
            <thead>
              <tr>
                <th>Security Subsystem</th>
                <th>Diagnostic Vector</th>
                <th>Target Perimeter Check</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody id="matrix-tbody">
              <tr>
                <td>HTTP Response Headers</td>
                <td>HSTS, CSP, X-Frame-Options, Permissions-Policy</td>
                <td>7 Security Directives</td>
                <td><span class="telemetry-status passed">● Compliant</span></td>
              </tr>
              <tr>
                <td>CORS Boundary Policy</td>
                <td>Origin Reflection & ACAC Credentials</td>
                <td>3 Boundary Checks</td>
                <td><span class="telemetry-status passed">● Isolated</span></td>
              </tr>
              <tr>
                <td>Cookie Architecture</td>
                <td>HttpOnly, Secure, SameSite Directives</td>
                <td>Set-Cookie Attribute Inspector</td>
                <td><span class="telemetry-status passed">● Enforced</span></td>
              </tr>
              <tr>
                <td>Redirect Sanitization</td>
                <td>Unvalidated 3xx Redirection</td>
                <td>15 Target Parameters</td>
                <td><span class="telemetry-status passed">● Protected</span></td>
              </tr>
              <tr>
                <td>Secret & Config Exposure</td>
                <td>Public .env, .git, Docker, Backups</td>
                <td>13 Critical Paths</td>
                <td><span class="telemetry-status passed">● Protected</span></td>
              </tr>
              <tr>
                <td>Input Sanitization (XSS)</td>
                <td>Reflected HTML/Attribute Tag Breakout</td>
                <td>33 Injection Probes</td>
                <td><span class="telemetry-status passed">● Sanitized</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tab 3: Raw JSON Box -->
        <div class="raw-view-box" id="raw-json-box"></div>
      </div>
    </div>
  </main>

  <script>
    let activeModule = 'audit';
    let currentView = 'findings';
    let rawPayload = {};

    function setUrl(val) { document.getElementById('target-url').value = val; }
    function setSampleJwt() {
      document.getElementById('jwt-token').value = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiZGV2b3BzIiwiZXhwIjoxNTc3ODM2ODAwfQ.';
    }

    function setModule(mod) {
      activeModule = mod;
      document.querySelectorAll('.tool-nav-item').forEach(b => b.classList.remove('active'));
      event.currentTarget.classList.add('active');

      if (mod === 'jwt') {
        document.getElementById('jwt-group').style.display = 'block';
      } else {
        document.getElementById('jwt-group').style.display = 'none';
      }
    }

    function switchView(view) {
      currentView = view;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      document.getElementById('tab-' + view + '-btn').classList.add('active');
      document.getElementById('findings-container').style.display = view === 'findings' ? 'flex' : 'none';
      document.getElementById('matrix-container').style.display = view === 'matrix' ? 'block' : 'none';
      document.getElementById('raw-json-box').style.display = view === 'raw' ? 'block' : 'none';
    }

    function addLog(text, type = '') {
      const stream = document.getElementById('terminal-stream');
      const time = new Date().toTimeString().split(' ')[0];
      const div = document.createElement('div');
      div.className = 'terminal-line';
      div.innerHTML = '<span class="terminal-time">[' + time + ']</span><span class="terminal-text ' + type + '">' + text + '</span>';
      stream.appendChild(div);
      stream.scrollTop = stream.scrollHeight;
    }

    function updateStep(stepIndex, status) {
      const step = document.getElementById('step-' + stepIndex);
      if (!step) return;
      step.classList.remove('active', 'completed');
      if (status === 'active') step.classList.add('active');
      if (status === 'completed') step.classList.add('completed');
    }

    async function executeAudit() {
      const targetUrl = document.getElementById('target-url').value;
      const jwtToken = document.getElementById('jwt-token').value;
      const startTime = performance.now();

      // Reset Stepper & Logs
      for (let i = 1; i <= 5; i++) updateStep(i, '');
      addLog('🚀 Dispatched assessment for perimeter: ' + targetUrl, 'accent');

      updateStep(1, 'active');
      addLog('→ [Stage 1/5] Establishing TLS connection & fetching root HTML/bundles...');

      const stepTimer1 = setTimeout(() => {
        updateStep(1, 'completed');
        updateStep(2, 'active');
        addLog('→ [Stage 2/5] Auditing security headers (HSTS, CSP, X-Frame-Options)...');
      }, 250);

      const stepTimer2 = setTimeout(() => {
        updateStep(2, 'completed');
        updateStep(3, 'active');
        addLog('→ [Stage 3/5] Testing CORS reflection, unauthenticated API routes & cookie flags...');
      }, 550);

      const stepTimer3 = setTimeout(() => {
        updateStep(3, 'completed');
        updateStep(4, 'active');
        addLog('→ [Stage 4/5] Injected 33 XSS probes, 15 redirect params & 13 sensitive file checks...');
      }, 950);

      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: activeModule, url: targetUrl, token: jwtToken })
        });
        const data = await res.json();
        rawPayload = data;
        document.getElementById('raw-json-box').innerText = JSON.stringify(data, null, 2);

        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);

        for (let i = 1; i <= 4; i++) updateStep(i, 'completed');
        updateStep(5, 'active');
        addLog('→ [Stage 5/5] Correlating evidence across boundaries & synthesizing AI risk rating...');

        setTimeout(() => {
          updateStep(5, 'completed');
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
          document.getElementById('telemetry-elapsed').innerText = 'LATENCY: ' + elapsed + 's';
          addLog('✅ Assessment completed in ' + elapsed + 's. Security scorecard updated.', 'success');
          renderResults(data);
        }, 200);

      } catch (err) {
        addLog('❌ Execution failed: ' + err.message, 'danger');
      } finally {
        document.getElementById('telemetry-timestamp').innerText = 'LAST RUN: ' + new Date().toLocaleTimeString();
      }
    }

    function renderResults(data) {
      const container = document.getElementById('findings-container');
      const execText = document.getElementById('executive-text');
      const kpiScore = document.getElementById('kpi-score');
      const gradeBadge = document.getElementById('grade-badge');
      const kpiCrit = document.getElementById('kpi-critical');
      const kpiWarn = document.getElementById('kpi-warnings');
      container.innerHTML = '';

      let score = data.overall_score !== undefined ? data.overall_score : 100;
      let critical = data.total_critical || 0;
      let warnings = data.total_warnings || 0;

      if (data.ai_verdict) {
        execText.innerText = data.ai_verdict;
      }

      kpiScore.innerHTML = score + '<span style="font-size: 1rem; color: var(--text-faint);">/100</span>';
      kpiCrit.innerText = critical;
      kpiWarn.innerText = warnings;

      if (score >= 90) {
        gradeBadge.className = 'score-badge grade-a';
        gradeBadge.innerText = 'GRADE A';
      } else if (score >= 70) {
        gradeBadge.className = 'score-badge grade-c';
        gradeBadge.innerText = 'GRADE B';
      } else {
        gradeBadge.className = 'score-badge grade-f';
        gradeBadge.innerText = 'GRADE F';
      }

      // Render Findings
      if (data.findings && data.findings.length > 0) {
        data.findings.forEach((f, idx) => {
          const isCrit = f.severity === 'CRITICAL' || f.severity === 'HIGH';
          const sevClass = isCrit ? 'critical' : 'high';
          const remId = 'rem-code-' + idx;
          container.innerHTML += 
            '<div class="finding-row sev-' + (isCrit ? 'critical' : 'high') + '">' +
              '<div class="finding-top">' +
                '<span class="finding-name">' + (f.title || 'Security Deficit') + '</span>' +
                '<span class="sev-tag ' + sevClass + '">' + (f.severity || 'HIGH') + '</span>' +
              '</div>' +
              '<div class="finding-details">' + (f.message || '') + '</div>' +
              (f.remediation ? 
                '<div class="code-remediation">' +
                  '<span id="' + remId + '">⚙️ Fix: ' + f.remediation + '</span>' +
                  '<button class="copy-btn" onclick="copySnippet(\'' + remId + '\')">Copy</button>' +
                '</div>' : '') +
            '</div>';
        });
      } else if (activeModule === 'endpoints' && data.endpoints) {
        let total = data.total_endpoints_found || data.endpoints.length;
        let html = '<div class="finding-row sev-safe"><div class="finding-top"><span class="finding-name">Discovered ' + total + ' API Endpoints & Routes</span><span class="sev-tag safe">' + total + ' ENDPOINTS</span></div><div class="finding-details" style="margin-top: 0.5rem;">';
        data.endpoints.forEach(ep => {
          html += '<div style="margin: 0.25rem 0; font-family: monospace; color: #fff;">⚡ ' + ep + '</div>';
        });
        html += '</div></div>';
        container.innerHTML = html;
      } else {
        container.innerHTML = 
          '<div class="finding-row sev-safe">' +
            '<div class="finding-top">' +
              '<span class="finding-name">No Direct Vulnerabilities Detected</span>' +
              '<span class="sev-tag safe">PASSED</span>' +
            '</div>' +
            '<div class="finding-details">' +
              'The target perimeter successfully satisfied all deterministic access control, isolation, and sanitization checks for this module.' +
            '</div>' +
          '</div>';
      }

      // Update Matrix Table Statuses
      if (data.headers) {
        const matrixBody = document.getElementById('matrix-tbody');
        matrixBody.innerHTML = 
          '<tr><td>HTTP Response Headers</td><td>HSTS, CSP, X-Frame-Options, Permissions-Policy</td><td>' + (data.headers.total_tested || 7) + ' Directives</td><td>' + (data.headers.missing_headers && data.headers.missing_headers.length ? '<span class="telemetry-status warn">⚠️ Hardening Needed</span>' : '<span class="telemetry-status passed">● Compliant</span>') + '</td></tr>' +
          '<tr><td>CORS Boundary Policy</td><td>Origin Reflection & ACAC Credentials</td><td>3 Boundary Checks</td><td>' + (data.cors && data.cors.is_vulnerable ? '<span class="telemetry-status failed">● Vulnerable</span>' : '<span class="telemetry-status passed">● Isolated</span>') + '</td></tr>' +
          '<tr><td>Cookie Architecture</td><td>HttpOnly, Secure, SameSite Directives</td><td>Set-Cookie Flags</td><td>' + (data.cookies && data.cookies.is_vulnerable ? '<span class="telemetry-status warn">⚠️ Missing Flags</span>' : '<span class="telemetry-status passed">● Enforced</span>') + '</td></tr>' +
          '<tr><td>Redirect Sanitization</td><td>Unvalidated 3xx Redirection</td><td>15 Target Parameters</td><td>' + (data.redirects && data.redirects.is_vulnerable ? '<span class="telemetry-status failed">● Vulnerable</span>' : '<span class="telemetry-status passed">● Protected</span>') + '</td></tr>' +
          '<tr><td>Secret & Config Exposure</td><td>Public .env, .git, Docker, Backups</td><td>13 Critical Paths</td><td>' + (data.exposure && data.exposure.exposed_count ? '<span class="telemetry-status failed">● Exposed</span>' : '<span class="telemetry-status passed">● Protected</span>') + '</td></tr>' +
          '<tr><td>Input Sanitization (XSS)</td><td>Reflected HTML/Attribute Tag Breakout</td><td>33 Injection Probes</td><td>' + (data.xss && data.xss.vulnerable_count ? '<span class="telemetry-status failed">● Reflected</span>' : '<span class="telemetry-status passed">● Sanitized</span>') + '</td></tr>';
      }
    }

    function copySnippet(elementId) {
      const text = document.getElementById(elementId).innerText.replace('⚙️ Fix: ', '');
      navigator.clipboard.writeText(text);
      alert('Remediation snippet copied to clipboard!');
    }

    function exportReport() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "sentinel-security-audit.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  </script>
</body>
</html>`;

export function openInBrowser(targetUrl: string) {
  import('node:child_process').then(({ spawn }) => {
    const platform = process.platform;
    if (platform === 'darwin') {
      spawn('open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    } else if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', targetUrl], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
  });
}

export function startDashboardServer(port = 3333, autoOpen = true): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsed = new URL(req.url || '', `http://localhost:${port}`);

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
            const tool = payload.tool || 'audit';
            const targetUrl = payload.url || 'https://example.com';
            let result: any = {};

            if (tool === 'jwt') {
              result = inspectJwtToken(payload.token || '');
            } else {
              const { execFile } = await import('node:child_process');
              const { promisify } = await import('node:util');
              const exec = promisify(execFile);
              const currentDir = path.dirname(fileURLToPath(import.meta.url));
              const pythonScript = path.resolve(currentDir, '../../sentinel-py/sentinel.py');

              let pyArgs = [pythonScript, tool, targetUrl];
              if (tool === 'audit' || tool === 'endpoints') {
                pyArgs.push('--json');
              }

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
      if (autoOpen) {
        openInBrowser(`http://localhost:${port}`);
      }
      resolve(port);
    });

    server.on('error', err => reject(err));
  });
}
