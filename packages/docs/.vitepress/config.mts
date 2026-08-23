import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Sentinel",
  description: "Deterministic security analysis for code, web targets, and MCP systems.",
  head: [
    ['meta', { property: 'og:title', content: 'Sentinel | Deterministic Security Platform' }],
    ['meta', { property: 'og:description', content: 'The first tri-boundary security orchestrator for the AI agentic web.' }],
    ['meta', { property: 'og:image', content: 'https://sentinel-security.dev/og-image.jpg' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Vision (For VCs)', link: '/vision/the-problem' },
      { text: 'Research (For Academics)', link: '/research/methodology' },
      { text: 'Documentation', link: '/getting-started/introduction' },
      { text: 'API', link: '/api-reference/README' }
    ],
    search: {
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
          { text: 'Heuristic Algorithms', link: '/research/algorithms' }
        ]
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
          { text: 'First Scan', link: '/getting-started/first-scan' },
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
          { text: 'Data Flow', link: '/architecture/data-flow' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Shared Models', link: '/api-reference/modules/shared_src' },
          { text: 'Platform Orchestrator', link: '/api-reference/modules/platform_src' }
        ]
      },
      {
        text: 'Engines',
        items: [
          { text: 'CodeSentinel', link: '/engines/codesentinel' },
          { text: 'WebSentinel', link: '/engines/websentinel' },
          { text: 'MCPSentinel', link: '/engines/mcpsentinel' }
        ]
      },
      {
        text: 'Platform',
        items: [
          { text: 'Orchestrator', link: '/platform/orchestrator' },
          { text: 'Correlation', link: '/platform/correlation' },
          { text: 'Reporting', link: '/platform/reporting' },
          { text: 'Configuration', link: '/platform/configuration' }
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
        text: 'Security',
        items: [
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
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pushp314/ApTes' }
    ]
  }
})
