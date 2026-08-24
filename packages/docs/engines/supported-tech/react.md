# React & SPA Support

Single Page Applications (SPAs) like React, Vue, and Angular represent a unique challenge because the HTML is rendered dynamically via JavaScript. Traditional static HTML scrapers fail completely on SPAs.

## WebSentinel (Playwright Crawler)

Sentinel handles SPAs beautifully by using **WebSentinel**, which drives a headless Chromium browser using Playwright. 

### Capabilities on SPAs

1. **Hydration Waiting**: WebSentinel waits for the React/Vue virtual DOM to fully hydrate before scanning.
2. **State Fuzzing**: It automatically finds `<input>`, `<textarea>`, and `<form>` elements and injects XSS/SQLi payloads, then monitors the resulting DOM mutations to see if the payload executed.
3. **AI Widget Discovery**: WebSentinel specifically hunts for floating chat widgets (often used for customer support AI) and attempts prompt-injection fuzzing on the chat interface.

### Framework Agnostic
Because WebSentinel operates on the rendered DOM, it is 100% framework agnostic. Whether you use React, Next.js, Vue, Nuxt, Angular, or Svelte, WebSentinel will analyze it accurately.
