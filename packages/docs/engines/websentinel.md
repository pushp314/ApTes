# WebSentinel

WebSentinel is the dynamic frontend analysis engine. It uses `playwright` to crawl live targets and assert structural, functional, and security properties.

## Target Validation & SSRF Protection

WebSentinel actively enforces Server-Side Request Forgery (SSRF) protection.
- It intercepts the requested URL and resolves its DNS.
- **Blocked:** `localhost`, `127.0.0.1`, `169.254.169.254` (Cloud Metadata), and `10.x.x.x` ranges are strictly prohibited.
- If a target resolves to a forbidden IP, the scan aborts immediately with an SSRF violation error.
- **Override:** For local development and fixture testing, you must pass `--allow-local`.

## What WebSentinel DOES NOT Do
- It is **not** an exploit runner.
- It does not attempt SQL injection or XSS payloads against forms.
- It does not fuzz parameters.

## Implemented Rules

### 1. AI Widget Detection & DOM Correlation (`ai-widget`) (Phase 19)
- **Purpose:** Detects the presence of third-party AI chat widgets and interactively probes them to trace their exact network footprint.
- **Detection:** Real-world vendor domains (e.g., Intercom, Zendesk) and DOM classes (`chat-widget`).
- **DOM Context Correlation:**
  - **Visual Capture:** Automatically captures high-resolution bounding-box screenshots of the detected widget.
  - **Interactive Fuzzing:** Instructs Playwright to locate the chat input, type a tracking payload (`[SENTINEL-TRACKING-ID]`), and click the submit button.
  - **Network Correlation:** Monitors the exact `fetch`/`xhr` API requests that fire immediately following the interaction to mathematically prove which backend route is responsible for serving the widget.

### 2. Console Errors (`web-console-errors`)
- **Purpose:** Catches unhandled JavaScript exceptions.
- **Detection:** Listens to the `page.on('pageerror')` and `console.error` events in Playwright.

### 3. Structure & Forms (`web-page-structure`, `invalid-form`)
- **Purpose:** Ensures basic HTML semantics.
- **Detection:** Validates `<h1>`, `<title>`, and `<form>` actions via DOM queries.

### 4. Security Headers & Cookies (`security-headers`, `cookie-security`)
- **Purpose:** Checks for modern web protections.
- **Detection:** Inspects the HTTP response headers for `Strict-Transport-Security`, `X-Frame-Options`, and `Secure`/`HttpOnly` cookie flags.

### 5. Network Health (`broken-links`, `broken-images`, `mixed-content`)
- **Purpose:** Detects dead resources and insecure HTTP loads on HTTPS pages.
