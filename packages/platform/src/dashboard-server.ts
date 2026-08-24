/**
 * Sentinel Unified Mission Control Web Dashboard Server
 * Tier-1 Enterprise Cybersecurity & Threat Management Platform with AI Copilot
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

    /* Finding Rows & Forensic Evidence Box */
    .findings-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 600px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .finding-row {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
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
      font-size: 0.95rem;
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

    /* Forensic HTTP Evidence Drawer */
    .forensic-box {
      background: #040508;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.85rem 1rem;
      margin-top: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #94a3b8;
    }

    .forensic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-faint);
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }

    .forensic-line {
      margin: 0.25rem 0;
      word-break: break-all;
    }

    .forensic-preview {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 0.5rem 0.75rem;
      margin-top: 0.45rem;
      max-height: 100px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #cbd5e1;
    }

    .finding-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .action-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.35rem 0.7rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.12s ease;
    }

    .action-btn:hover {
      background: var(--surface-hover);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .action-btn.ai-btn {
      background: #fff;
      color: #000;
      font-weight: 700;
      border: none;
    }
    .action-btn.ai-btn:hover { background: #e2e8f0; }

    /* AI Copilot Chat Panel */
    .ai-chat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      display: none;
      flex-direction: column;
      gap: 1rem;
      min-height: 520px;
    }

    .ai-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.85rem;
    }

    .ai-model-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .model-select {
      background: var(--bg);
      border: 1px solid var(--border);
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
    }

    .chat-messages {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 420px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .chat-bubble {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-size: 0.86rem;
      line-height: 1.6;
    }

    .chat-bubble.user {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      align-self: flex-end;
      color: #fff;
      max-width: 80%;
    }

    .chat-bubble.ai {
      background: #040508;
      border: 1px solid var(--border);
      border-left: 3px solid #fff;
      color: #cbd5e1;
      align-self: flex-start;
      max-width: 100%;
      white-space: pre-wrap;
    }

    .chat-input-row {
      display: flex;
      gap: 0.75rem;
      margin-top: auto;
    }

    .chat-input {
      flex: 1;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-size: 0.86rem;
      font-family: inherit;
    }

    .chat-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }

    .chat-send-btn {
      background: #fff;
      color: #000;
      font-weight: 700;
      border: none;
      padding: 0 1.25rem;
      border-radius: 6px;
      cursor: pointer;
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
        <span id="gateway-telemetry">AI COPILOT ONLINE (dolphin-llama3 / Ollama)</span>
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
      <!-- Target Configuration -->
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

      <!-- Tabbed Findings & AI Copilot Workspace -->
      <div class="content-card" id="content-card">
        <div class="tab-bar">
          <div class="tabs-group">
            <button class="tab-btn active" id="tab-findings-btn" onclick="switchView('findings')">Findings & Forensic Evidence</button>
            <button class="tab-btn" id="tab-copilot-btn" onclick="switchView('copilot')">🤖 AI Copilot Chat</button>
            <button class="tab-btn" id="tab-matrix-btn" onclick="switchView('matrix')">Verification Matrix</button>
            <button class="tab-btn" id="tab-raw-btn" onclick="switchView('raw')">Raw JSON Telemetry</button>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-faint); font-family: 'JetBrains Mono', monospace;" id="telemetry-timestamp">
            STATUS: IDLE
          </div>
        </div>

        <!-- Tab 1: Findings List with Forensics -->
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

        <!-- Tab 2: AI Security Copilot Chat -->
        <div class="ai-chat-card" id="ai-chat-container">
          <div class="ai-chat-header">
            <div class="ai-model-picker">
              <span>Selected LLM:</span>
              <select class="model-select" id="ollama-model-select">
                <option value="dolphin-llama3:latest" selected>dolphin-llama3:latest (Local Ollama)</option>
                <option value="llama3:latest">llama3:latest</option>
                <option value="mistral:latest">mistral:latest</option>
                <option value="deepseek-coder:latest">deepseek-coder:latest</option>
              </select>
            </div>
            <span style="font-size: 0.75rem; color: var(--success);">● Local LLM Gateway Connected</span>
          </div>

          <div class="chat-messages" id="chat-messages">
            <div class="chat-bubble ai">
              Hello! I am your <strong>Sentinel AI Security Copilot</strong> powered by <code>dolphin-llama3:latest</code>. 
I have access to your full diagnostic audit telemetry, HTTP forensic headers, and response payloads. 
Ask me how to manually verify any finding with <code>curl</code>, evaluate potential exploit paths safely, or generate framework code remediation (Express, Next.js, FastAPI, Django).
            </div>
          </div>

          <div class="chat-input-row">
            <input type="text" class="chat-input" id="chat-user-input" placeholder="Ask AI Copilot (e.g. 'Explain why /api/keys returned 200 OK and how to verify')..." onkeydown="if(event.key==='Enter') sendChatMessage()">
            <button class="chat-send-btn" onclick="sendChatMessage()">Send</button>
          </div>
        </div>

        <!-- Tab 3: Verification Matrix Table -->
        <div id="matrix-container" style="display: none;">
          <table class="telemetry-table" style="width: 100%; border-collapse: collapse; font-family: monospace; font-size: 0.8rem;">
            <thead>
              <tr style="background: var(--surface-elevated); color: var(--text-faint); text-align: left;">
                <th style="padding: 0.6rem 0.8rem;">Security Subsystem</th>
                <th style="padding: 0.6rem 0.8rem;">Diagnostic Vector</th>
                <th style="padding: 0.6rem 0.8rem;">Target Perimeter Check</th>
                <th style="padding: 0.6rem 0.8rem;">Compliance Status</th>
              </tr>
            </thead>
            <tbody id="matrix-tbody">
              <tr>
                <td style="padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border-subtle);">HTTP Response Headers</td>
                <td style="padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border-subtle);">HSTS, CSP, X-Frame-Options, Permissions-Policy</td>
                <td style="padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border-subtle);">7 Security Directives</td>
                <td style="padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--border-subtle);"><span style="color: var(--success);">● Compliant</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tab 4: Raw JSON Box -->
        <div id="raw-json-box" style="display: none; background: #040508; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; font-family: monospace; font-size: 0.8rem; color: #94a3b8; height: 520px; overflow-y: auto; white-space: pre-wrap;"></div>
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
      document.getElementById('ai-chat-container').style.display = view === 'copilot' ? 'flex' : 'none';
      document.getElementById('matrix-container').style.display = view === 'matrix' ? 'block' : 'none';
      document.getElementById('raw-json-box').style.display = view === 'raw' ? 'block' : 'none';
    }

    async function executeAudit() {
      const targetUrl = document.getElementById('target-url').value;
      const jwtToken = document.getElementById('jwt-token').value;

      document.getElementById('telemetry-timestamp').innerText = 'STATUS: RUNNING AUDIT...';

      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: activeModule, url: targetUrl, token: jwtToken })
        });
        const data = await res.json();
        rawPayload = data;
        document.getElementById('raw-json-box').innerText = JSON.stringify(data, null, 2);
        renderResults(data);
      } catch (err) {
        document.getElementById('findings-container').innerHTML = '<div class="finding-row sev-critical"><div class="finding-name">Assessment Error</div><div class="finding-details">' + err.message + '</div></div>';
      } finally {
        document.getElementById('telemetry-timestamp').innerText = 'LAST RUN: ' + new Date().toLocaleTimeString();
      }
    }

    let currentFindingsList = [];

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
      currentFindingsList = data.findings || [];

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

      // Render Findings with HTTP Forensic Evidence
      if (currentFindingsList.length > 0) {
        currentFindingsList.forEach((f, idx) => {
          const isCrit = f.severity === 'CRITICAL' || f.severity === 'HIGH';
          const sevClass = isCrit ? 'critical' : 'high';
          const bodyPrev = f.body_snippet || f.message;

          container.innerHTML += 
            '<div class="finding-row sev-' + sevClass + '">' +
              '<div class="finding-top">' +
                '<span class="finding-name">' + escapeHtml(f.title || 'Security Deficit') + '</span>' +
                '<span class="sev-tag ' + sevClass + '">' + escapeHtml(f.severity || 'HIGH') + '</span>' +
              '</div>' +
              '<div class="finding-details">' + escapeHtml(f.message || '') + '</div>' +
              
              // Forensic Evidence Drawer
              '<div class="forensic-box">' +
                '<div class="forensic-header">' +
                  '<span>🔬 HTTP Forensic Evidence & Payload Inspection</span>' +
                  '<span>' + (f.status_code ? 'HTTP ' + f.status_code + ' OK' : 'DAST CHECK') + '</span>' +
                '</div>' +
                '<div class="forensic-line"><strong>Target Endpoint:</strong> <code>' + escapeHtml(f.url || f.route || 'Target') + '</code></div>' +
                (f.content_type ? '<div class="forensic-line"><strong>Response Content-Type:</strong> <code>' + escapeHtml(f.content_type) + '</code></div>' : '') +
                (f.is_spa_fallback ? '<div class="forensic-line" style="color: var(--warning);">⚠️ Note: Served client-side Single Page Application HTML index page fallback.</div>' : '') +
                '<div class="forensic-preview">' + escapeHtml(bodyPrev) + '</div>' +
              '</div>' +

              // Action Toolbar
              '<div class="finding-actions">' +
                '<button class="action-btn" onclick="copyCurlFinding(' + idx + ')">📋 Copy cURL PoC</button>' +
                '<button class="action-btn" onclick="copyFixFinding(' + idx + ')">⚙️ Copy Fix</button>' +
                '<button class="action-btn ai-btn" onclick="askAiAboutFinding(' + idx + ')">🤖 Ask AI Copilot</button>' +
              '</div>' +
            '</div>';
        });
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
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function copyCurlFinding(idx) {
      const f = currentFindingsList[idx];
      if (!f) return;
      const curlCmd = f.curl_command || ('curl -i "' + (f.url || document.getElementById('target-url').value) + '"');
      navigator.clipboard.writeText(curlCmd);
      alert('Copied cURL command to clipboard: ' + curlCmd);
    }

    function copyFixFinding(idx) {
      const f = currentFindingsList[idx];
      if (!f) return;
      const fix = f.remediation || '';
      navigator.clipboard.writeText(fix);
      alert('Copied remediation snippet to clipboard.');
    }

    function askAiAboutFinding(idx) {
      const f = currentFindingsList[idx];
      if (!f) return;
      switchView('copilot');
      const input = document.getElementById('chat-user-input');
      const curlCmd = f.curl_command || ('curl -i "' + (f.url || document.getElementById('target-url').value) + '"');
      const snippet = (f.body_snippet || f.message || '').substring(0, 150);
      input.value = "I need advice on finding: '" + f.title + "'. Endpoint: " + (f.url || f.route) + ". Request: " + curlCmd + ". Evidence: " + snippet + "... How should I safely verify and remediate this in code?";
      sendChatMessage();
    }

    async function sendChatMessage() {
      const input = document.getElementById('chat-user-input');
      const text = input.value.trim();
      if (!text) return;

      const chatContainer = document.getElementById('chat-messages');
      const model = document.getElementById('ollama-model-select').value;

      // Add user message
      chatContainer.innerHTML += '<div class="chat-bubble user">' + escapeHtml(text) + '</div>';
      input.value = '';

      // Add AI loading bubble
      const aiBubbleId = 'ai-msg-' + Date.now();
      chatContainer.innerHTML += '<div class="chat-bubble ai" id="' + aiBubbleId + '"><em>AI Copilot is analyzing forensic evidence via ' + model + '...</em></div>';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      try {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            model: model,
            context: {
              targetUrl: document.getElementById('target-url').value,
              telemetry: rawPayload
            }
          })
        });

        const data = await response.json();
        const aiBubble = document.getElementById(aiBubbleId);
        aiBubble.innerHTML = escapeHtml(data.response || data.message || 'No response generated from local LLM.');
      } catch (err: any) {
        const el = document.getElementById(aiBubbleId);
        if (el) {
          el.innerHTML = '<span style="color: var(--danger);">Ollama LLM connection error: ' + (err?.message || 'Offline') + '. Ensure Ollama is running with "ollama run dolphin-llama3:latest".</span>';
        }
      }
      chatContainer.scrollTop = chatContainer.scrollHeight;
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

      // AI Copilot Chat Endpoint (Ollama Local Integration with dolphin-llama3)
      if (req.method === 'POST' && parsed.pathname === '/api/ai-chat') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const prompt = payload.prompt || '';
            const model = payload.model || 'dolphin-llama3:latest';
            const contextData = payload.context || {};

            const systemPrompt = `You are Sentinel AI Security Copilot, an elite defensive cybersecurity advisor and code remediation expert.
You have access to the diagnostic pentest findings and HTTP forensic request/response evidence for target: ${contextData.targetUrl || 'Unknown'}.
Telemetry Summary: ${JSON.stringify(contextData.telemetry?.findings || [], null, 2).substring(0, 1500)}

Your goals:
1. Explain why specific HTTP status codes (like 200 OK, 401, 403) occurred (differentiating between real sensitive endpoints and client-side SPA router fallbacks).
2. Provide exact curl reproduction steps so the security engineer can manually inspect the response headers and body.
3. Provide precise, copyable code remediation in relevant frameworks (Express, Next.js, FastAPI, Django, NGINX).
4. Maintain a clear, defensive security engineer perspective.`;

            // Call local Ollama on http://localhost:11434
            try {
              const ollamaReq = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: model,
                  prompt: prompt,
                  system: systemPrompt,
                  stream: false,
                })
              });

              if (ollamaReq.ok) {
                const ollamaData = (await ollamaReq.json()) as any;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: ollamaData.response }));
                return;
              }
            } catch {
              // If Ollama is offline or model not pulled, return helpful fallback
            }

            // Built-in Rule-Based Security Advisor Fallback
            const fallbackResponse = `[Sentinel Built-in Security Analysis]
Finding Context: ${prompt}

Manual Verification Steps:
1. Run \`curl -i -X GET "${contextData.targetUrl || 'http://localhost:5173'}/api/keys"\`
2. Check the \`Content-Type\` header:
   - If \`Content-Type: text/html\` with \`<!doctype html>\`, it is likely a client-side Single Page Application (SPA) router fallback serving the UI.
   - If \`Content-Type: application/json\` returning raw tokens or keys, it is an unprotected backend API endpoint.

Recommended Defensive Remediation (Express / Node.js):
\`\`\`javascript
import { authenticateUser } from './middleware/auth.js';
app.use('/api', authenticateUser); // Enforce 401 Unauthorized for unauthenticated requests
\`\`\`

Note: To enable conversational LLM generation, ensure Ollama is running with: \`ollama run ${model}\`.`;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response: fallbackResponse }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      // Security Audit Runner Endpoint
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
