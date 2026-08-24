/**
 * Sentinel Unified Mission Control Web Dashboard Server
 * Tier-1 Enterprise Monochrome Cybersecurity & Threat Intelligence Platform
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
  <title>SENTINEL // Enterprise Threat Intelligence & Perimeter Defense</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000000;
      --surface: #0a0a0a;
      --surface-elevated: #121212;
      --surface-hover: #1c1c1c;
      --border: #222222;
      --border-subtle: #161616;
      --border-focus: #ffffff;
      
      --text-main: #ffffff;
      --text-muted: #a1a1aa;
      --text-faint: #52525b;
      
      --accent: #ffffff;
      --accent-dim: rgba(255, 255, 255, 0.08);
      
      --danger: #ffffff;
      --danger-bg: #18181b;
      --danger-border: #3f3f46;
      
      --warning: #e4e4e7;
      --warning-bg: #18181b;
      --warning-border: #3f3f46;
      
      --success: #ffffff;
      --success-bg: #18181b;
      --success-border: #3f3f46;
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
      letter-spacing: -0.01em;
    }

    /* Enterprise Navigation Header */
    header {
      height: 56px;
      padding: 0 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: 0.04em;
      color: #fff;
      text-decoration: none;
      text-transform: uppercase;
    }

    .brand-icon {
      width: 22px;
      height: 22px;
      background: #fff;
      color: #000;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 900;
    }

    .env-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
    }

    .header-center {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .gateway-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
    }

    .indicator-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-main);
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
      font-family: 'JetBrains Mono', monospace;
    }

    .btn-outline:hover {
      background: var(--surface-elevated);
      border-color: #fff;
    }

    /* Main Workspace Layout */
    main {
      flex: 1;
      max-width: 1680px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem 1.75rem;
      display: grid;
      grid-template-columns: 310px 1fr;
      gap: 1.5rem;
    }

    /* Left Sidebar */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .panel-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.15rem;
    }

    .panel-title {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin-bottom: 0.6rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-section-title {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin: 0.85rem 0 0.35rem 0.4rem;
    }
    .nav-section-title:first-child { margin-top: 0; }

    .nav-item {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.5rem 0.65rem;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
      font-size: 0.8rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.12s ease;
      margin-bottom: 2px;
    }

    .nav-item:hover {
      background: var(--surface-elevated);
      color: #fff;
    }

    .nav-item.active {
      background: #fff;
      color: #000;
      font-weight: 700;
    }

    .nav-item.active .item-tag {
      background: #000;
      color: #fff;
    }

    .item-tag {
      font-size: 0.65rem;
      font-weight: 700;
      background: var(--surface-elevated);
      color: var(--text-faint);
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
    }

    .form-label {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }

    .form-control {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.55rem 0.75rem;
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      transition: all 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #fff;
    }

    .preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.45rem;
    }

    .chip {
      font-size: 0.68rem;
      font-family: 'JetBrains Mono', monospace;
      background: var(--surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      cursor: pointer;
    }
    .chip:hover { color: #fff; border-color: #fff; }

    .btn-exec {
      width: 100%;
      background: #fff;
      color: #000;
      border: none;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      padding: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.85rem;
      transition: all 0.15s ease;
    }
    .btn-exec:hover { background: #e4e4e7; }
    .btn-exec:active { transform: scale(0.99); }

    /* Right Main Canvas */
    .workspace {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Enterprise Metric Tiles */
    .kpi-row {
      display: grid;
      grid-template-columns: 220px repeat(3, 1fr);
      gap: 0.85rem;
    }

    .kpi-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.15rem;
    }

    .kpi-top {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-faint);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .kpi-num {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #fff;
      line-height: 1;
    }

    .kpi-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }

    .grade-pill {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      background: #fff;
      color: #000;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Live Operational Activity & Behind The Scenes Stream */
    .operations-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.15rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .operations-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-faint);
    }

    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
    }

    .pipe-step {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      padding: 0.6rem 0.75rem;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      transition: all 0.15s ease;
    }

    .pipe-step.active {
      border-color: #fff;
      background: #18181b;
    }

    .pipe-step.completed {
      border-color: #52525b;
      background: var(--surface);
    }

    .pipe-num {
      font-size: 0.62rem;
      font-weight: 800;
      color: var(--text-faint);
      font-family: 'JetBrains Mono', monospace;
    }

    .pipe-step.active .pipe-num { color: #fff; }
    .pipe-step.completed .pipe-num { color: var(--text-muted); }

    .pipe-label {
      font-size: 0.74rem;
      font-weight: 700;
      color: #fff;
    }

    .console-stream {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.75rem 0.9rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.74rem;
      color: #a1a1aa;
      max-height: 140px;
      overflow-y: auto;
      line-height: 1.6;
    }

    .console-row { display: flex; gap: 0.65rem; }
    .console-t { color: var(--text-faint); }
    .console-m { color: #e4e4e7; }
    .console-m.active { color: #fff; font-weight: 700; }
    .console-m.ok { color: #fff; }
    .console-m.alert { color: #fff; text-decoration: underline; }

    /* Executive Threat Verdict */
    .executive-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid #fff;
      border-radius: 6px;
      padding: 1.15rem 1.35rem;
    }

    .executive-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .executive-tag {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #fff;
    }

    .framework-badge {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
    }

    .executive-summary {
      font-size: 0.84rem;
      color: #d4d4d8;
      line-height: 1.6;
    }

    /* Main Tabbed Findings & Copilot Section */
    .canvas-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.35rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 540px;
    }

    .tab-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      margin-bottom: 1.15rem;
    }

    .tab-group { display: flex; gap: 0.4rem; }

    .nav-tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .nav-tab:hover { color: #fff; }
    .nav-tab.active {
      background: var(--surface-elevated);
      color: #fff;
      font-weight: 700;
    }

    /* Finding Items */
    .findings-stack {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      max-height: 620px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .finding-block {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.15rem;
    }
    .finding-block.critical { border-left: 3px solid #fff; }
    .finding-block.safe { border-left: 3px solid #52525b; }

    .finding-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.4rem;
    }

    .finding-title-text {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
    }

    .finding-badge {
      font-size: 0.65rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      background: #fff;
      color: #000;
      text-transform: uppercase;
    }

    .finding-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* Forensic Evidence Drawer */
    .evidence-box {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.75rem 0.9rem;
      margin-top: 0.65rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem;
      color: #a1a1aa;
    }

    .evidence-title {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--text-faint);
      text-transform: uppercase;
      margin-bottom: 0.35rem;
      display: flex;
      justify-content: space-between;
    }

    .evidence-snippet {
      background: #09090b;
      border: 1px solid var(--border-subtle);
      border-radius: 3px;
      padding: 0.45rem 0.65rem;
      margin-top: 0.4rem;
      max-height: 90px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: #e4e4e7;
    }

    .actions-bar {
      display: flex;
      gap: 0.45rem;
      margin-top: 0.75rem;
    }

    .act-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 0.3rem 0.65rem;
      border-radius: 3px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
    }
    .act-btn:hover { background: var(--surface-hover); color: #fff; border-color: #fff; }
    .act-btn.primary { background: #fff; color: #000; border: none; font-weight: 800; }
    .act-btn.primary:hover { background: #e4e4e7; }

    /* AI Copilot Panel */
    .copilot-panel {
      display: none;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      min-height: 480px;
    }

    .copilot-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .model-selector {
      background: #000;
      border: 1px solid var(--border);
      color: #fff;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
    }

    .chat-flow {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 440px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .chat-card {
      padding: 1rem 1.25rem;
      border-radius: 6px;
      font-size: 0.84rem;
      line-height: 1.6;
    }

    .chat-card.user {
      background: var(--surface-elevated);
      border: 1px solid var(--border);
      align-self: flex-end;
      color: #fff;
      max-width: 85%;
    }

    .chat-card.ai {
      background: #06070a;
      border: 1px solid #27272a;
      border-left: 3px solid #38bdf8;
      color: #e4e4e7;
      align-self: flex-start;
      max-width: 100%;
    }

    /* Markdown Code Blocks & Syntax Styling */
    .code-container {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 6px;
      margin: 0.65rem 0;
      overflow: hidden;
      font-family: 'JetBrains Mono', monospace;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.35rem 0.75rem;
      background: #141417;
      border-bottom: 1px solid #27272a;
      font-size: 0.68rem;
    }

    .code-lang-tag {
      color: #38bdf8;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .copy-code-btn {
      background: #1e1e24;
      border: 1px solid #2e2e38;
      color: #a1a1aa;
      font-size: 0.68rem;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.12s ease;
    }
    .copy-code-btn:hover { background: #2a2a35; color: #fff; border-color: #fff; }

    .code-body {
      padding: 0.75rem 1rem;
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.5;
      overflow-x: auto;
      color: #f4f4f5;
    }

    .md-inline-code {
      background: #18181b;
      border: 1px solid #27272a;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.76rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }

    .md-h2 { font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0.6rem 0 0.3rem 0; border-bottom: 1px solid #27272a; padding-bottom: 0.2rem; }
    .md-h3 { font-size: 0.95rem; font-weight: 700; color: #f8fafc; margin: 0.5rem 0 0.25rem 0; }
    .md-h4 { font-size: 0.88rem; font-weight: 700; color: #e2e8f0; margin: 0.45rem 0 0.2rem 0; }
    .md-bold { color: #fff; font-weight: 700; }
    .md-italic { color: #cbd5e1; font-style: italic; }

    .md-list-item {
      display: flex;
      gap: 0.5rem;
      margin: 0.35rem 0;
      line-height: 1.5;
    }
    .md-list-num { color: #38bdf8; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .md-list-bullet { color: #38bdf8; font-size: 0.75rem; }

    /* Quick Prompt Chips */
    .copilot-prompt-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 0.5rem;
    }

    .prompt-chip {
      font-size: 0.7rem;
      background: var(--surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.12s ease;
      font-family: 'JetBrains Mono', monospace;
    }
    .prompt-chip:hover {
      background: #18181b;
      color: #fff;
      border-color: #38bdf8;
    }

    .chat-compose {
      display: flex;
      gap: 0.6rem;
      margin-top: 0.5rem;
    }

    .chat-box-input {
      flex: 1;
      background: #000;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.65rem 0.85rem;
      color: #fff;
      font-size: 0.82rem;
      font-family: inherit;
    }
    .chat-box-input:focus { outline: none; border-color: #38bdf8; }

    .chat-submit-btn {
      background: #fff;
      color: #000;
      font-weight: 800;
      font-size: 0.78rem;
      border: none;
      padding: 0 1.15rem;
      border-radius: 4px;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.12s ease;
    }
    .chat-submit-btn:hover { background: #38bdf8; color: #000; }

    /* Verification Matrix Table */
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .matrix-table th {
      text-align: left;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-faint);
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid var(--border);
      background: var(--surface-elevated);
    }

    .matrix-table td {
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
      color: #d4d4d8;
    }
  </style>
</head>
<body>

  <!-- Top Enterprise Navbar -->
  <header>
    <div class="brand-group">
      <a href="/" class="brand-logo">
        <div class="brand-icon">S</div>
        <span>SENTINEL</span>
      </a>
      <span class="env-tag">ENTERPRISE GATEWAY v0.1</span>
    </div>

    <div class="header-center">
      <div class="gateway-indicator">
        <span class="indicator-pulse"></span>
        <span id="gateway-telemetry">PERIMETER DAEMONS: AST • DAST • PYTHON • RECON</span>
      </div>
    </div>

    <div class="header-actions">
      <button class="btn-outline" onclick="exportReport()">
        <span>EXPORT TELEMETRY</span>
      </button>
    </div>
  </header>

  <!-- Main Grid Workspace -->
  <main>
    <!-- Left Navigation Sidebar -->
    <div class="sidebar">
      <!-- Target Configuration Panel -->
      <div class="panel-card">
        <div class="panel-title">
          <span>Target Perimeter</span>
          <span style="color: #fff;">[ACTIVE]</span>
        </div>
        <input type="text" id="target-url" class="form-control" placeholder="https://app.example.com" value="https://example.com">
        
        <div class="preset-chips">
          <span class="chip" onclick="setUrl('https://example.com')">example.com</span>
          <span class="chip" onclick="setUrl('http://localhost:3000')">localhost:3000</span>
          <span class="chip" onclick="setUrl('http://localhost:5173')">localhost:5173</span>
          <span class="chip" onclick="setUrl('http://localhost:8000')">localhost:8000</span>
        </div>

        <div id="jwt-group" style="display: none; margin-top: 0.85rem;">
          <div class="form-label">JWT Token Claims</div>
          <textarea id="jwt-token" class="form-control" rows="3" placeholder="eyJhbGciOiJIUzI1Ni..."></textarea>
          <div class="preset-chips">
            <span class="chip" onclick="setSampleJwt()">Load Insecure Alg=None Token</span>
          </div>
        </div>

        <button class="btn-exec" id="btn-execute" onclick="executeAudit()">
          <span>EXECUTE SECURITY ASSESSMENT</span>
        </button>
      </div>

      <!-- Domain Navigation Panel -->
      <div class="panel-card">
        <div class="nav-section-title" style="color: var(--accent); margin-top: 0;">AI Threat Intelligence</div>
        <button class="nav-item" id="nav-btn-copilot" onclick="setAppView('copilot')" style="border-left: 2px solid var(--accent); background: rgba(0, 255, 170, 0.05);">
          <span>🤖 Sentinel AI Copilot</span>
          <span class="item-tag" style="background: var(--accent); color: #000;">CHAT</span>
        </button>

        <div class="nav-section-title" style="margin-top: 1.5rem;">Orchestrated Assessments</div>
        <button class="nav-item active" id="nav-btn-audit" onclick="setModule('audit'); setAppView('scanner')">
          <span>360° Unified Assessment</span>
          <span class="item-tag">ALL</span>
        </button>
        <button class="nav-item" onclick="setModule('endpoints')">
          <span>Attack Surface Recon</span>
          <span class="item-tag">MAP</span>
        </button>

        <div class="nav-section-title">Perimeter & Infrastructure</div>
        <button class="nav-item" onclick="setModule('headers')">
          <span>HTTP Security Headers</span>
          <span class="item-tag">DAST</span>
        </button>
        <button class="nav-item" onclick="setModule('exposure')">
          <span>Sensitive File Exposure</span>
          <span class="item-tag">SECRETS</span>
        </button>
        <button class="nav-item" onclick="setModule('cors')">
          <span>CORS Policy & Isolation</span>
          <span class="item-tag">ORIGIN</span>
        </button>

        <div class="nav-section-title">Identity & Application Layer</div>
        <button class="nav-item" onclick="setModule('auth')">
          <span>Route Access & IDOR Prober</span>
          <span class="item-tag">RBAC</span>
        </button>
        <button class="nav-item" onclick="setModule('cookies')">
          <span>Cookie & CSRF Hardening</span>
          <span class="item-tag">FLAGS</span>
        </button>
        <button class="nav-item" onclick="setModule('redirect')">
          <span>Open Redirect Scanner</span>
          <span class="item-tag">3XX</span>
        </button>
        <button class="nav-item" onclick="setModule('xss')">
          <span>Reflected XSS Injection</span>
          <span class="item-tag">INJECT</span>
        </button>
        <button class="nav-item" onclick="setModule('jwt')">
          <span>JWT Cryptographic Audit</span>
          <span class="item-tag">TOKEN</span>
        </button>
        <button class="nav-item" onclick="setModule('admin')">
          <span>Admin Panel Discovery</span>
          <span class="item-tag">RECON</span>
        </button>
      </div>
    </div>

    <!-- Right Workspace Canvas -->
    <!-- Scanner Page View -->
    <div class="workspace" id="scanner-page-container">
      <!-- Enterprise KPI Row -->
      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-top">
            <span>Security Rating</span>
            <span class="grade-pill" id="grade-badge">GRADE A</span>
          </div>
          <div class="kpi-num" id="kpi-score">100<span style="font-size: 0.9rem; color: var(--text-faint);">/100</span></div>
          <div class="kpi-meta">Compliance Index</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-top">Critical Vulnerabilities</div>
          <div class="kpi-num" id="kpi-critical">0</div>
          <div class="kpi-meta">Direct Exploitable Flaws</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-top">Hardening Gaps</div>
          <div class="kpi-num" id="kpi-warnings">0</div>
          <div class="kpi-meta">Missing Security Flags</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-top">Audited Subsystems</div>
          <div class="kpi-num" id="kpi-boundaries">7/7</div>
          <div class="kpi-meta">Active Perimeter Checkpoints</div>
        </div>
      </div>

      <!-- Live Operations & Behind The Scenes Telemetry -->
      <div class="operations-card">
        <div class="operations-top">
          <span>Diagnostic Execution Telemetry (Behind The Scenes)</span>
          <span style="font-family: 'JetBrains Mono', monospace;" id="telemetry-elapsed">LATENCY: 0.00s</span>
        </div>

        <!-- Dynamic Progress Bar & ETA -->
        <div id="progress-container" style="display: flex; flex-direction: column; gap: 0.4rem; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 4px; padding: 0.75rem 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace;">
            <span id="progress-label" style="color: #fff; font-weight: 700;">STATUS: READY FOR ASSESSMENT</span>
            <span id="progress-eta" style="color: var(--text-muted);">ESTIMATED DURATION: ~2.5s</span>
          </div>
          <div style="background: #000; border: 1px solid var(--border); border-radius: 3px; height: 8px; overflow: hidden; width: 100%;">
            <div id="progress-fill" style="background: #fff; height: 100%; width: 0%; transition: width 0.15s ease;"></div>
          </div>
        </div>

        <!-- 5-Stage Stepper -->
        <div class="pipeline-grid">
          <div class="pipe-step" id="step-1">
            <span class="pipe-num">01 / RECON</span>
            <span class="pipe-label">Perimeter Handshake</span>
          </div>
          <div class="pipe-step" id="step-2">
            <span class="pipe-num">02 / HEADERS</span>
            <span class="pipe-label">Security Directives</span>
          </div>
          <div class="pipe-step" id="step-3">
            <span class="pipe-num">03 / IDENTITY</span>
            <span class="pipe-label">Auth & CORS Probing</span>
          </div>
          <div class="pipe-step" id="step-4">
            <span class="pipe-num">04 / EXPLOITS</span>
            <span class="pipe-label">XSS & Redirect Fuzzing</span>
          </div>
          <div class="pipe-step" id="step-5">
            <span class="pipe-num">05 / SYNTHESIS</span>
            <span class="pipe-label">AI Threat Scoring</span>
          </div>
        </div>

        <!-- Real-time Console Log Stream -->
        <div class="console-stream" id="console-stream">
          <div class="console-row">
            <span class="console-t">[00:00:00]</span>
            <span class="console-m">Sentinel Enterprise Engine initialized. Select target perimeter to dispatch diagnostic daemons.</span>
          </div>
        </div>
      </div>

      <!-- Executive Risk Verdict Callout -->
      <div class="executive-card" id="executive-card">
        <div class="executive-top">
          <span class="executive-tag">Executive Threat Assessment & Synthesis</span>
          <span class="framework-badge">OWASP TOP 10 • SOC2 TYPE II COMPLIANCE READY</span>
        </div>
        <div class="executive-summary" id="executive-text">
          Target perimeter ready for diagnostic execution. Select a security domain on the left and trigger an orchestrated assessment.
        </div>
      </div>

      <!-- Canvas Card: Findings, Copilot, Matrix & Raw JSON -->
      <div class="canvas-card">
        <div class="tab-header">
          <div class="tab-group">
            <button class="nav-tab active" id="tab-findings-btn" onclick="switchView('findings')">Findings & Forensic Evidence</button>
            <button class="nav-tab" id="tab-matrix-btn" onclick="switchView('matrix')">Verification Matrix</button>
            <button class="nav-tab" id="tab-raw-btn" onclick="switchView('raw')">Raw Telemetry JSON</button>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-faint); font-family: 'JetBrains Mono', monospace;" id="telemetry-timestamp">
            STATUS: IDLE
          </div>
        </div>

        <!-- Tab 1: Findings List with Forensic Details -->
        <div class="findings-stack" id="findings-container">
          <div class="finding-block safe">
            <div class="finding-heading">
              <span class="finding-title-text">Perimeter Gateway Initialized</span>
              <span class="finding-badge">READY</span>
            </div>
            <div class="finding-desc">
              Sentinel Enterprise Gateway is online. Enter your target URL and execute an assessment to inspect active defenses and detect potential attack vectors.
            </div>
          </div>
        </div>

        <!-- Tab 3: Verification Matrix Table -->
        <div id="matrix-container" style="display: none;">
          <table class="matrix-table">
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
                <td><span style="color: #fff;">● Compliant</span></td>
              </tr>
              <tr>
                <td>CORS Boundary Policy</td>
                <td>Origin Reflection & ACAC Credentials</td>
                <td>3 Boundary Checks</td>
                <td><span style="color: #fff;">● Isolated</span></td>
              </tr>
              <tr>
                <td>Cookie Architecture</td>
                <td>HttpOnly, Secure, SameSite Directives</td>
                <td>Set-Cookie Flags</td>
                <td><span style="color: #fff;">● Enforced</span></td>
              </tr>
              <tr>
                <td>Redirect Sanitization</td>
                <td>Unvalidated 3xx Redirection</td>
                <td>15 Target Parameters</td>
                <td><span style="color: #fff;">● Protected</span></td>
              </tr>
              <tr>
                <td>Secret & Config Exposure</td>
                <td>Public .env, .git, Docker, Backups</td>
                <td>13 Critical Paths</td>
                <td><span style="color: #fff;">● Protected</span></td>
              </tr>
              <tr>
                <td>Input Sanitization (XSS)</td>
                <td>Reflected HTML/Attribute Tag Breakout</td>
                <td>33 Injection Probes</td>
                <td><span style="color: #fff;">● Sanitized</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tab 4: Raw JSON Output -->
        <div id="raw-container" style="display: none;">
          <pre id="raw-json-box">{}</pre>
        </div>
      </div>
    </div>

    <!-- Copilot Page View -->
    <div class="workspace" id="copilot-page-container" style="display: none;">
      <div class="executive-card" style="margin-bottom: 1rem; border-color: var(--accent);">
        <div class="executive-top">
          <span class="executive-tag" style="color: var(--accent);">Sentinel AI Security Copilot</span>
          <span class="framework-badge" style="border-color: var(--accent); color: var(--accent);">OLLAMA LOCAL LLM INTEGRATION</span>
        </div>
        <div class="executive-summary" style="color: #fff;">
          Full-context AI assistant for security remediation, validation, and vulnerability triage.
        </div>
      </div>

      <div class="canvas-card" style="flex: 1; display: flex; flex-direction: column; padding: 1.5rem;">
        <div class="copilot-panel" id="ai-chat-container" style="display: flex; height: 100%;">
          <div class="copilot-top" style="margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
              <span>LOCAL LLM MODEL:</span>
              <select class="model-selector" id="ollama-model-select">
                <option value="dolphin-llama3:latest" selected>dolphin-llama3:latest (Local Ollama)</option>
                <option value="llama3:latest">llama3:latest</option>
                <option value="mistral:latest">mistral:latest</option>
                <option value="deepseek-coder:latest">deepseek-coder:latest</option>
              </select>
            </div>
            <span style="font-size: 0.72rem; color: #fff; font-family: 'JetBrains Mono', monospace;">● OLLAMA LOCAL GATEWAY READY</span>
          </div>

          <div class="chat-flow" id="chat-messages" style="flex: 1; max-height: unset;">
            <div class="chat-card ai">Hello! I am your <strong>Sentinel AI Security Copilot</strong> powered by <code>dolphin-llama3:latest</code>.
I have access to your full diagnostic audit telemetry, HTTP forensic headers, and response payloads. 
Ask me how to manually verify any finding with <code>curl</code>, evaluate potential exploit paths safely, or generate framework code remediation (Express, Next.js, FastAPI, Django).</div>
          </div>

          <div class="copilot-prompt-chips" style="margin-top: 1rem;">
            <span class="prompt-chip" onclick="setChatPrompt('Explain why sensitive endpoints returned 200 OK and if it is an SPA router fallback.')">⚡ Explain 200 OK</span>
            <span class="prompt-chip" onclick="setChatPrompt('Provide Node.js / Express authentication middleware to protect all /api routes.')">🛡️ Express Fix</span>
            <span class="prompt-chip" onclick="setChatPrompt('Provide Python / FastAPI dependency to enforce JWT Bearer auth.')">🐍 FastAPI Fix</span>
            <span class="prompt-chip" onclick="setChatPrompt('Show curl manual reproduction commands to verify response headers and bodies.')">🔬 cURL Verification</span>
          </div>

          <div class="chat-compose" style="margin-top: 1rem;">
            <input type="text" class="chat-box-input" id="chat-user-input" placeholder="Ask AI Copilot (e.g. 'Analyze why /api/keys returned 200 OK and give remediation code')..." onkeydown="if(event.key==='Enter') sendChatMessage()">
            <button class="chat-submit-btn" onclick="sendChatMessage()">Send</button>
          </div>
        </div>
      </div>
    </div>
    </div>

  <script>
    let activeModule = 'audit';
    let rawPayload = null;
    let chatHistory = [];

    function setAppView(view) {
      document.getElementById('scanner-page-container').style.display = view === 'scanner' ? 'flex' : 'none';
      document.getElementById('copilot-page-container').style.display = view === 'copilot' ? 'flex' : 'none';
      
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      if (view === 'copilot') {
        document.getElementById('nav-btn-copilot').classList.add('active');
      } else {
        document.getElementById('nav-btn-audit').classList.add('active'); // fallback
        setModule(activeModule);
      }
    }

    function switchView(view) {
      const isFindings = view === 'findings';
      const isMatrix = view === 'matrix';
      const isRaw = view === 'raw';
      
      document.getElementById('findings-container').style.display = isFindings ? 'flex' : 'none';
      document.getElementById('matrix-container').style.display = isMatrix ? 'block' : 'none';
      document.getElementById('raw-container').style.display = isRaw ? 'block' : 'none';

      document.getElementById('tab-findings-btn').className = 'nav-tab' + (isFindings ? ' active' : '');
      document.getElementById('tab-matrix-btn').className = 'nav-tab' + (isMatrix ? ' active' : '');
      document.getElementById('tab-raw-btn').className = 'nav-tab' + (isRaw ? ' active' : '');
    }

    function setUrl(val) { document.getElementById('target-url').value = val; }
    function setSampleJwt() {
      document.getElementById('jwt-token').value = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiZGV2b3BzIiwiZXhwIjoxNTc3ODM2ODAwfQ.';
    }

    function setModule(mod) {
      if (typeof setAppView === 'function') setAppView('scanner');
      activeModule = mod;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      event.currentTarget.classList.add('active');

      if (mod === 'jwt') {
        document.getElementById('jwt-group').style.display = 'block';
      } else {
        document.getElementById('jwt-group').style.display = 'none';
      }
    }

    function switchView(view) {
      currentView = view;
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      
      document.getElementById('tab-' + view + '-btn').classList.add('active');
      document.getElementById('findings-container').style.display = view === 'findings' ? 'flex' : 'none';
      document.getElementById('ai-chat-container').style.display = view === 'copilot' ? 'flex' : 'none';
      document.getElementById('matrix-container').style.display = view === 'matrix' ? 'block' : 'none';
      document.getElementById('raw-json-box').style.display = view === 'raw' ? 'block' : 'none';
    }

    function addConsoleLog(text, type = '') {
      const stream = document.getElementById('console-stream');
      const time = new Date().toTimeString().split(' ')[0];
      const div = document.createElement('div');
      div.className = 'console-row';
      div.innerHTML = '<span class="console-t">[' + time + ']</span><span class="console-m ' + type + '">' + escapeHtml(text) + '</span>';
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

    function setProgress(percent, labelText, etaText) {
      const fill = document.getElementById('progress-fill');
      const label = document.getElementById('progress-label');
      const eta = document.getElementById('progress-eta');
      if (fill) fill.style.width = Math.min(100, percent) + '%';
      if (label) label.innerText = labelText + ' (' + Math.min(100, Math.round(percent)) + '%)';
      if (eta && etaText) eta.innerText = etaText;
    }

    async function executeAudit() {
      const targetUrl = document.getElementById('target-url').value;
      const jwtToken = document.getElementById('jwt-token').value;
      const startTime = performance.now();

      for (let i = 1; i <= 5; i++) updateStep(i, '');
      setProgress(5, 'INITIALIZING DIAGNOSTIC DAEMONS', 'ESTIMATED TIME: ~2.5s');
      addConsoleLog('⚡ Dispatched perimeter assessment for: ' + targetUrl, 'active');

      updateStep(1, 'active');
      setProgress(15, 'STAGE 1/5: TLS HANDSHAKE & RECON', 'ESTIMATED TIME: ~2.0s');
      addConsoleLog('→ [Stage 1/5] Establishing TLS connection & resolving root endpoints...');

      let currentPercent = 15;
      const progressInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        document.getElementById('telemetry-elapsed').innerText = 'LATENCY: ' + elapsed.toFixed(2) + 's';

        if (elapsed < 0.4) {
          currentPercent = 25;
          updateStep(1, 'completed');
          updateStep(2, 'active');
          setProgress(currentPercent, 'STAGE 2/5: AUDITING SECURITY DIRECTIVES', 'ESTIMATED TIME: ~1.8s');
        } else if (elapsed < 0.8) {
          currentPercent = 45;
          updateStep(2, 'completed');
          updateStep(3, 'active');
          setProgress(currentPercent, 'STAGE 3/5: IDENTITY, CORS & AUTH PROBES', 'ESTIMATED TIME: ~1.2s');
        } else if (elapsed < 1.6) {
          currentPercent = Math.min(85, currentPercent + 4);
          updateStep(3, 'completed');
          updateStep(4, 'active');
          const remaining = Math.max(0.2, (2.5 - elapsed)).toFixed(1);
          setProgress(currentPercent, 'STAGE 4/5: EXPLOITS & SENSITIVE PATHS', 'ESTIMATED TIME: ~' + remaining + 's');
        } else {
          currentPercent = Math.min(92, currentPercent + 1);
          updateStep(4, 'active');
          setProgress(currentPercent, 'STAGE 4/5: PARALLEL PROBING (FINAL CHECKS)', 'ESTIMATED TIME: ~0.5s');
        }
      }, 100);

      try {
        const res = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: activeModule, url: targetUrl, token: jwtToken })
        });
        const data = await res.json();
        rawPayload = data;
        document.getElementById('raw-json-box').innerText = JSON.stringify(data, null, 2);

        clearInterval(progressInterval);

        for (let i = 1; i <= 4; i++) updateStep(i, 'completed');
        updateStep(5, 'active');
        setProgress(95, 'STAGE 5/5: AI EVIDENCE CORRELATION', 'ESTIMATED TIME: ~0.2s');
        addConsoleLog('→ [Stage 5/5] Correlating evidence across boundaries & synthesizing AI risk rating...');

        setTimeout(() => {
          updateStep(5, 'completed');
          setProgress(100, 'AUDIT COMPLETE: 100%', 'DIAGNOSTICS FINISHED');
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
          document.getElementById('telemetry-elapsed').innerText = 'LATENCY: ' + elapsed + 's';
          addConsoleLog('✅ Assessment completed in ' + elapsed + 's. Security scorecard updated.', 'ok');
          renderResults(data);
        }, 150);

      } catch (err) {
        clearInterval(progressInterval);
        setProgress(0, 'EXECUTION ERROR', 'FAILED');
        addConsoleLog('❌ Execution error: ' + err.message, 'alert');
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
      currentFindingsList = data.findings || [];

      if (data.ai_verdict) {
        execText.innerText = data.ai_verdict;
      }

      kpiScore.innerHTML = score + '<span style="font-size: 0.9rem; color: var(--text-faint);">/100</span>';
      kpiCrit.innerText = critical;
      kpiWarn.innerText = warnings;

      if (score >= 90) {
        gradeBadge.innerText = 'GRADE A';
      } else if (score >= 70) {
        gradeBadge.innerText = 'GRADE B';
      } else {
        gradeBadge.innerText = 'GRADE F';
      }

      // Render Findings with HTTP Forensic Evidence
      if (currentFindingsList.length > 0) {
        currentFindingsList.forEach((f, idx) => {
          const isCrit = f.severity === 'CRITICAL' || f.severity === 'HIGH';
          const sevClass = isCrit ? 'critical' : 'safe';
          const bodyPrev = f.body_snippet || f.message;

          container.innerHTML += 
            '<div class="finding-block ' + sevClass + '">' +
              '<div class="finding-heading">' +
                '<span class="finding-title-text">' + escapeHtml(f.title || 'Security Deficit') + '</span>' +
                '<span class="finding-badge">' + escapeHtml(f.severity || 'HIGH') + '</span>' +
              '</div>' +
              '<div class="finding-desc">' + escapeHtml(f.message || '') + '</div>' +
              
              // Forensic Evidence Drawer
              '<div class="evidence-box">' +
                '<div class="evidence-title">' +
                  '<span>🔬 HTTP FORENSIC REQUEST & RESPONSE EVIDENCE</span>' +
                  '<span>' + (f.status_code ? 'HTTP ' + f.status_code + ' OK' : 'DAST INSPECTION') + '</span>' +
                '</div>' +
                '<div><strong>Target Endpoint:</strong> <code>' + escapeHtml(f.url || f.route || 'Target') + '</code></div>' +
                (f.content_type ? '<div><strong>Response Content-Type:</strong> <code>' + escapeHtml(f.content_type) + '</code></div>' : '') +
                (f.is_spa_fallback ? '<div style="color: #fff; margin-top: 0.2rem;">⚠️ Single Page Application (SPA) HTML index router fallback detected.</div>' : '') +
                '<div class="evidence-snippet">' + escapeHtml(bodyPrev) + '</div>' +
              '</div>' +

              // Action Toolbar
              '<div class="actions-bar">' +
                '<button class="act-btn" onclick="copyCurlFinding(' + idx + ')">📋 COPY CURL POC</button>' +
                '<button class="act-btn" onclick="copyFixFinding(' + idx + ')">⚙️ COPY REMEDIATION</button>' +
                '<button class="act-btn primary" onclick="askAiAboutFinding(' + idx + ')">🤖 ASK AI COPILOT</button>' +
              '</div>' +
            '</div>';
        });
      } else if (activeModule === 'endpoints' && data.endpoints) {
        let total = data.total_endpoints_found || data.endpoints.length;
        let html = '<div class="finding-block safe"><div class="finding-heading"><span class="finding-title-text">Discovered ' + total + ' API Endpoints & Routes</span><span class="finding-badge">' + total + ' ROUTES</span></div><div class="finding-desc" style="margin-top: 0.5rem;">';
        data.endpoints.forEach(ep => {
          html += '<div style="margin: 0.25rem 0; font-family: monospace; color: #fff;">⚡ ' + escapeHtml(ep) + '</div>';
        });
        html += '</div></div>';
        container.innerHTML = html;
      } else {
        container.innerHTML = 
          '<div class="finding-block safe">' +
            '<div class="finding-heading">' +
              '<span class="finding-title-text">No Direct Vulnerabilities Detected</span>' +
              '<span class="finding-badge">PASSED</span>' +
            '</div>' +
            '<div class="finding-desc">' +
              'The target perimeter successfully satisfied all deterministic access control, isolation, and sanitization checks for this module.' +
            '</div>' +
          '</div>';
      }

      // Update Matrix Table Statuses
      if (data.headers) {
        const matrixBody = document.getElementById('matrix-tbody');
        matrixBody.innerHTML = 
          '<tr><td>HTTP Response Headers</td><td>HSTS, CSP, X-Frame-Options, Permissions-Policy</td><td>' + (data.headers.total_tested || 7) + ' Directives</td><td>' + (data.headers.missing_headers && data.headers.missing_headers.length ? '<span style="color: #fff;">⚠️ Hardening Needed</span>' : '<span style="color: #fff;">● Compliant</span>') + '</td></tr>' +
          '<tr><td>CORS Boundary Policy</td><td>Origin Reflection & ACAC Credentials</td><td>3 Boundary Checks</td><td>' + (data.cors && data.cors.is_vulnerable ? '<span style="color: #fff;">● Vulnerable</span>' : '<span style="color: #fff;">● Isolated</span>') + '</td></tr>' +
          '<tr><td>Cookie Architecture</td><td>HttpOnly, Secure, SameSite Directives</td><td>Set-Cookie Flags</td><td>' + (data.cookies && data.cookies.is_vulnerable ? '<span style="color: #fff;">⚠️ Missing Flags</span>' : '<span style="color: #fff;">● Enforced</span>') + '</td></tr>' +
          '<tr><td>Redirect Sanitization</td><td>Unvalidated 3xx Redirection</td><td>15 Target Parameters</td><td>' + (data.redirects && data.redirects.is_vulnerable ? '<span style="color: #fff;">● Vulnerable</span>' : '<span style="color: #fff;">● Protected</span>') + '</td></tr>' +
          '<tr><td>Secret & Config Exposure</td><td>Public .env, .git, Docker, Backups</td><td>13 Critical Paths</td><td>' + (data.exposure && data.exposure.exposed_count ? '<span style="color: #fff;">● Exposed</span>' : '<span style="color: #fff;">● Protected</span>') + '</td></tr>' +
          '<tr><td>Input Sanitization (XSS)</td><td>Reflected HTML/Attribute Tag Breakout</td><td>33 Injection Probes</td><td>' + (data.xss && data.xss.vulnerable_count ? '<span style="color: #fff;">● Reflected</span>' : '<span style="color: #fff;">● Sanitized</span>') + '</td></tr>';
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

    function setChatPrompt(text) {
      const input = document.getElementById('chat-user-input');
      input.value = text;
      sendChatMessage();
    }

    function renderMarkdownToHtml(md) {
      if (!md) return '';
      
      const codeBlocks = [];
      const fenceRegex = new RegExp('\\x60\\x60\\x60([a-zA-Z0-9_-]*)[\\r\\n]([\\s\\S]*?)\\x60\\x60\\x60', 'g');
      let formatted = md.replace(fenceRegex, function(match, lang, code) {
        const placeholder = '___CODE_BLOCK_' + codeBlocks.length + '___';
        const langLabel = (lang || 'CODE').toUpperCase();
        const cleanCode = (code || '').trim();
        const highlighted = highlightCodeSyntax(cleanCode, lang);
        const blockHtml = 
          '<div class="code-container">' +
            '<div class="code-header">' +
              '<span class="code-lang-tag">' + escapeHtml(langLabel) + '</span>' +
              '<button class="copy-code-btn" onclick="copySnippetCode(this)">📋 Copy Code</button>' +
            '</div>' +
            '<pre class="code-body"><code>' + highlighted + '</code></pre>' +
            '<textarea style="display:none;" class="raw-code-store">' + escapeHtml(cleanCode) + '</textarea>' +
          '</div>';
        codeBlocks.push(blockHtml);
        return placeholder;
      });

      formatted = escapeHtml(formatted);
      formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
      formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="md-h3">$1</h3>');
      formatted = formatted.replace(/^# (.*$)/gim, '<h2 class="md-h2">$1</h2>');
      formatted = formatted.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="md-bold">$1</strong>');
      formatted = formatted.replace(/\\*(.*?)\\*/g, '<em class="md-italic">$1</em>');
      
      const inlineCodeRegex = new RegExp('\\x60([^\\x60]+)\\x60', 'g');
      formatted = formatted.replace(inlineCodeRegex, '<code class="md-inline-code">$1</code>');
      
      formatted = formatted.replace(/^\\s*(\\d+)\\.\\s+(.*$)/gim, '<div class="md-list-item"><span class="md-list-num">$1.</span><span>$2</span></div>');
      formatted = formatted.replace(/^\\s*[\\-\\*]\\s+(.*$)/gim, '<div class="md-list-item"><span class="md-list-bullet">●</span><span>$1</span></div>');
      formatted = formatted.replace(/\\n/g, '<br>');

      codeBlocks.forEach(function(block, i) {
        formatted = formatted.replace('___CODE_BLOCK_' + i + '___', block);
      });

      return formatted;
    }

    function highlightCodeSyntax(code, lang) {
      let escaped = escapeHtml(code);
      escaped = escaped.replace(/(["'])(?:(?=(\\\\?))\\2.)*?\\1/g, '<span style="color: #34d399;">$&</span>');
      const kwRegex = new RegExp('\\\\b(const|let|var|function|return|import|export|from|if|else|switch|case|break|class|def|async|await|try|catch|throw|while|for|in|of|new|this|extends|type|interface|app|use|get|post|put|delete|req|res|next)\\\\b', 'g');
      escaped = escaped.replace(kwRegex, '<span style="color: #38bdf8; font-weight: 600;">$&</span>');
      escaped = escaped.replace(/(\\/\\/[^\\n]*|#[^\\n]*)/g, '<span style="color: #94a3b8; font-style: italic;">$&</span>');
      escaped = escaped.replace(new RegExp('\\\\b(true|false|null|undefined|\\\\d+)\\\\b', 'g'), '<span style="color: #fbbf24;">$&</span>');
      return escaped;
    }

    function copySnippetCode(btn) {
      const container = btn.closest('.code-container');
      const textarea = container ? container.querySelector('.raw-code-store') : null;
      if (textarea) {
        navigator.clipboard.writeText(textarea.value);
        const orig = btn.innerText;
        btn.innerText = '✅ Copied!';
        setTimeout(() => btn.innerText = orig, 1500);
      }
    }

    async function sendChatMessage() {
      const input = document.getElementById('chat-user-input');
      const text = input.value.trim();
      if (!text) return;

      const chatContainer = document.getElementById('chat-messages');
      const model = document.getElementById('ollama-model-select').value;

      // Add user message
      chatContainer.innerHTML += '<div class="chat-card user">' + escapeHtml(text) + '</div>';
      input.value = '';

      // Add AI loading bubble
      const aiBubbleId = 'ai-msg-' + Date.now();
      chatContainer.innerHTML += '<div class="chat-card ai" id="' + aiBubbleId + '"><em>AI Copilot is analyzing telemetry and forensic headers via ' + escapeHtml(model) + '...</em></div>';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      try {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            model: model,
            history: chatHistory,
            context: {
              targetUrl: document.getElementById('target-url').value,
              telemetry: rawPayload
            }
          })
        });

        // Add user message to history
        chatHistory.push({ role: 'user', content: text });

        const data = await response.json();
        const aiBubble = document.getElementById(aiBubbleId);
        if (aiBubble) {
          const aiText = data.response || data.message || 'No response generated from local LLM.';
          aiBubble.innerHTML = renderMarkdownToHtml(aiText);
          chatHistory.push({ role: 'assistant', content: aiText });
        }
      } catch (err) {
        const el = document.getElementById(aiBubbleId);
        if (el) {
          el.innerHTML = '<span>Ollama LLM connection error: ' + escapeHtml(err.message) + '. Ensure Ollama is running with "ollama run dolphin-llama3:latest".</span>';
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

            const history = payload.history || [];
            if (prompt) {
              history.push({ role: 'user', content: prompt });
            }

            const messages = [
              { role: 'system', content: systemPrompt },
              ...history
            ];

            // Call local Ollama on http://localhost:11434 using /api/chat
            try {
              const ollamaReq = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: model,
                  messages: messages,
                  stream: false,
                })
              });

              if (ollamaReq.ok) {
                const ollamaData = (await ollamaReq.json()) as any;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: ollamaData.message?.content || ollamaData.response }));
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
              if (tool === 'audit' || tool === 'endpoints' || tool === 'admin') {
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
