# Sentinel Python Security & Pentest Toolkit

The **Sentinel Python Security Toolkit** is a zero-dependency, standalone security assessment and penetration testing suite written in pure Python 3 (`packages/sentinel-py/`).

It runs on any machine with standard Python 3 (3.8+) with no third-party packages required, leveraging Python's standard library (`urllib.request`, `http.client`, `ssl`, `socket`, `json`, `base64`, `argparse`, `concurrent.futures`).

---

## 🛠️ Complete Suite of 15 Python Security Tools

| Tool | Script / Command | Description |
| :--- | :--- | :--- |
| **Full 10-Vector Audit** | `sentinel.py audit` | Complete automated audit: Headers, CSP, SSL, CORS, Cookies, Redirects, Exposure, XSS, Auth, Admin |
| **Subdomain Scanner** | `sentinel.py subdomains` | Fast multithreaded DNS discovery of 50+ common subdomains |
| **SSL/TLS Analyzer** | `sentinel.py ssl` | Certificate expiration, cipher strength, self-signed detection, and protocol version check |
| **Tech Fingerprinter** | `sentinel.py fingerprint` | Detects backend frameworks, web servers, and version disclosures |
| **TCP Port Scanner** | `sentinel.py ports` | Fast multithreaded TCP port scanner with automatic banner grabbing |
| **CSP Deep Auditor** | `sentinel.py csp` | Analyzes Content-Security-Policy directives for XSS and clickjacking bypasses |
| **Admin & API Discovery** | `sentinel.py admin` | Probes 30+ common admin panels (`/admin`, `/wp-admin`, `/dashboard`) and internal APIs |
| **API Endpoint Discovery** | `sentinel.py endpoints` | Crawls HTML, extracts JS bundle routes, and parses Swagger/OpenAPI specs |
| **Open Redirect Prober** | `sentinel.py redirect` | Tests 15+ URL query parameters for unvalidated 3xx redirects |
| **Cookie & CSRF Auditor** | `sentinel.py cookies` | Audits `Set-Cookie` for `HttpOnly`, `Secure`, and `SameSite` compliance |
| **CORS Misconfiguration** | `sentinel.py cors` | Probes dynamic origin reflection and credential exposure |
| **JWT Token Inspector** | `sentinel.py jwt` | Audits JWT headers, flags algorithm `none`, and checks expiration |
| **Auth & IDOR Prober** | `sentinel.py auth` | Probes sensitive API routes to detect unauthenticated data leaks |
| **Sensitive File Exposure** | `sentinel.py exposure` | Detects leaked `.env`, `.git`, backups, and configuration files |
| **Reflected XSS Prober** | `sentinel.py xss` | Injects harmless canary probes to test parameter reflection and HTML encoding |

---

## 🚀 CLI Usage & Examples

### 1. Comprehensive 10-Vector Web Audit
Runs all diagnostic modules against the target and provides a formatted security scorecard.

```bash
python3 packages/sentinel-py/sentinel.py audit https://example.com
```

**JSON Mode (For CI/CD Pipelines):**
```bash
python3 packages/sentinel-py/sentinel.py audit https://example.com --json
```

---

### 2. Fast DNS Subdomain Discovery
Enumerates subdomains in parallel using standard library socket lookups.

```bash
python3 packages/sentinel-py/sentinel.py subdomains example.com
```

---

### 3. SSL/TLS Certificate & Transport Security
Inspects TLS cipher suites, certificate chains, expiration timestamps, and deprecations.

```bash
python3 packages/sentinel-py/sentinel.py ssl https://example.com
```

---

### 4. Technology Stack & Version Leak Fingerprinting
Identifies underlying web servers, JavaScript frameworks (React, Next.js, Vue), and backend engines.

```bash
python3 packages/sentinel-py/sentinel.py fingerprint https://example.com
```

---

### 5. TCP Port Scanner with Banner Grabbing
Probes common application and database ports (MySQL, Redis, PostgreSQL, MongoDB, Elasticsearch, etc.).

```bash
python3 packages/sentinel-py/sentinel.py ports example.com
```

---

### 6. Deep Content Security Policy (CSP) Audit
Analyzes `Content-Security-Policy` headers for `unsafe-inline`, `unsafe-eval`, wildcards, and missing clickjacking protections.

```bash
python3 packages/sentinel-py/sentinel.py csp https://example.com
```

---

### 7. Discover API Endpoints & Attack Surface
Extracts API endpoints from web pages, JavaScript files, and public documentation definitions.

```bash
python3 packages/sentinel-py/sentinel.py endpoints https://example.com
```

---

### 8. Admin Panel & Hidden API Probing
Scans for exposed backoffice consoles, admin logins, and unauthenticated API endpoints.

```bash
python3 packages/sentinel-py/sentinel.py admin https://example.com
```
