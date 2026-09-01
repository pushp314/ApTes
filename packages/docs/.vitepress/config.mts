import { defineConfig } from 'vitepress';

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default defineConfig({
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence!;
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        if (token.info.trim() === 'mermaid') {
          return `<pre class="mermaid" style="display: flex; justify-content: center; margin: 1.5rem 0; background: transparent;">${escapeHtml(token.content)}</pre>`;
        }
        return defaultFence(tokens, idx, options, env, self);
      };
    }
  },
  lastUpdated: true,
  title: "Sentinel",
  description: "Deterministic security analysis for code, web targets, and active network reconnaissance.",
  head: [
    ['meta', { property: 'og:title', content: 'Sentinel | Deterministic Security Platform' }],
    ['meta', { property: 'og:description', content: 'A unified correlation layer for the modern web.' }],
    ['meta', { property: 'og:image', content: 'https://sentinel-security.dev/og-image.jpg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    logo: '/favicon.ico',
    editLink: {
      pattern: 'https://github.com/pushp314/ApTes/edit/main/packages/docs/:path',
      text: 'Edit this page on GitHub'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/getting-started/introduction' },
      { text: 'API', link: '/api-reference/README' },
      { text: 'Enterprise', link: '/enterprise/overview' }
    ],
    search: process.env.USE_ALGOLIA ? {
      provider: 'algolia',
      options: {
        appId: process.env.ALGOLIA_APP_ID || 'YOUR_APP_ID',
        apiKey: process.env.ALGOLIA_API_KEY || 'YOUR_SEARCH_API_KEY',
        indexName: process.env.ALGOLIA_INDEX_NAME || 'sentinel'
      }
    } : {
      provider: 'local'
    },
    sidebar: [
      {
        text: 'Vision & Strategy',
        items: [
          { text: 'The Core Problem', link: '/vision/the-problem' },
          { text: 'The Sentinel Solution', link: '/vision/the-solution' },
          { text: 'Value Proposition', link: '/vision/value-proposition' }
        ]
      },
      {
        text: 'Research & Methodology',
        items: [
          { text: 'Architectural Methodology', link: '/research/methodology' },
          { text: 'Formal Security Guarantees', link: '/research/security-guarantees' },
          { text: 'Correlation Algorithms', link: '/research/correlation' },
          { text: 'Empirical Evaluation Harness', link: '/research/eval-harness' },
          { text: 'Heuristic Algorithms', link: '/research/algorithms' },
          { text: 'Benchmarks & Performance', link: '/research/benchmarks' }
        ]
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Interactive Playground', link: '/getting-started/playground' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
          { text: 'First Scan', link: '/getting-started/first-scan' },
          { text: 'Dashboard Guide', link: '/getting-started/dashboard-guide' },
          { text: 'FAQ', link: '/getting-started/faq' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'System Overview', link: '/architecture/system-overview' },
          { text: 'Repository Structure', link: '/architecture/repository-structure' },
          { text: 'Package Architecture', link: '/architecture/package-architecture' },
          { text: 'Scan Lifecycle', link: '/architecture/scan-lifecycle' },
          { text: 'Finding Model', link: '/architecture/finding-model' },
          { text: 'Data Flow', link: '/architecture/data-flow' },
          { text: 'AI Engine', link: '/architecture/ai-engine' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Shared Models', link: '/api-reference/shared/src/README' },
          { text: 'Platform Orchestrator', link: '/api-reference/platform/src/README' },
          { text: 'Custom Rules Tutorial', link: '/api-reference/tutorial-custom-rules' }
        ]
      },
      {
        text: 'Engines',
        items: [
          { text: 'CodeSentinel', link: '/engines/codesentinel' },
          { text: 'WebSentinel', link: '/engines/websentinel' },
          { text: 'ReconSentinel', link: '/engines/recon' },
          { text: 'MCPSentinel (Optional)', link: '/engines/mcpsentinel' },
          { text: 'Active DAST Engine', link: '/engines/dast' },
          {
            text: 'Supported Technologies',
            items: [
              { text: 'Node.js', link: '/engines/supported-tech/node' },
              { text: 'Python', link: '/engines/supported-tech/python' },
              { text: 'React & SPA', link: '/engines/supported-tech/react' }
            ]
          }
        ]
      },
      {
        text: 'Platform',
        items: [
          { text: 'Orchestrator', link: '/platform/orchestrator' },
          { text: 'Correlation', link: '/platform/correlation' },
          { text: 'Reporting', link: '/platform/reporting' },
          { text: 'Configuration', link: '/platform/configuration' },
          {
            text: 'Internals',
            items: [
              { text: 'Memory Management', link: '/platform/internals/memory-management' },
              { text: 'Orchestrator Event Loop', link: '/platform/internals/orchestrator-loop' }
            ]
          }
        ]
      },
      {
        text: 'AI Assist',
        items: [
          { text: 'Overview', link: '/ai-assist/overview' },
          { text: 'Ollama', link: '/ai-assist/ollama' },
          { text: 'Context Collector', link: '/ai-assist/context-collector' },
          { text: 'Secret Redaction', link: '/ai-assist/secret-redaction' },
          { text: 'Budget & Batching', link: '/ai-assist/budget-batching' },
          { text: 'Cache & Failures', link: '/ai-assist/cache-failures' }
        ]
      },
      {
        text: 'Security & Pentest Tools',
        items: [
          { text: 'Pentest & Security Suite', link: '/security/pentest-tools' },
          { text: 'Python Security Toolkit', link: '/security/python-toolkit' },
          { text: 'Security Model', link: '/security/security-model' },
          { text: 'SSRF Protection', link: '/security/ssrf-protection' },
          { text: 'MCP Isolation', link: '/security/mcp-isolation' },
          { text: 'Authorization', link: '/security/authorization' },
          { text: 'Secret Handling', link: '/security/secret-handling' },
          { text: 'Threat Model', link: '/security/threat-model' }
        ]
      },
      {
        text: 'CLI Reference',
        items: [
          { text: 'Interactive Wizard', link: '/cli-reference/interactive-wizard' },
          { text: 'Overview & Options', link: '/cli-reference/overview' },
          { text: 'Examples', link: '/cli-reference/examples' }
        ]
      },
      {
        text: 'Development',
        items: [
          { text: 'Dev Workflow', link: '/development/workflow' },
          { text: 'Contributor Guide', link: '/development/contributor-guide' },
          { text: 'Adding Rules', link: '/development/adding-rules' },
          { text: 'Testing & Fixtures', link: '/development/testing' }
        ]
      },
      {
        text: 'Project Status',
        items: [
          { text: 'Implementation Matrix', link: '/project-status/implementation-matrix' },
          { text: 'Changelog', link: '/project-status/changelog' },
          { text: 'Limitations', link: '/project-status/limitations' },
          { text: 'Roadmap', link: '/project-status/roadmap' }
        ]
      },
      {
        text: 'Enterprise',
        items: [
          { text: 'Enterprise Overview', link: '/enterprise/overview' },
          { text: 'Deployment & Air-gapped', link: '/enterprise/deployment' },
          { text: 'SSO & RBAC', link: '/enterprise/sso-rbac' },
          { text: 'Security & Compliance', link: '/enterprise/compliance' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pushp314/ApTes' },
      { icon: 'x', link: 'https://twitter.com/SentinelSec' },
      { icon: 'linkedin', link: 'https://linkedin.com/company/sentinel-sec' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Sentinel Security Inc.'
    }
  }
})



