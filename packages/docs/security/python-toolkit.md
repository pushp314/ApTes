# Sentinel Python Security & Pentest Toolkit

The **Sentinel Python Security Toolkit** is a zero-dependency, standalone security assessment and penetration testing suite written in pure Python 3 (`packages/sentinel-py/`).

It runs on any machine with standard Python 3 (3.8+) with no third-party packages required, leveraging Python's standard library (`urllib.request`, `http.client`, `ssl`, `json`, `base64`, `argparse`).

---

## 🛠️ Included Python Security Tools

| Tool | Script | Description |
| :--- | :--- | :--- |
| **Full Web Audit** | `sentinel.py audit` | Multi-vector audit: Headers + CORS + Cookies + Redirects + Auth |
| **API Discovery** | `tools/api_finder.py` | Crawls HTML, extracts JS bundle routes, probes Swagger/OpenAPI |
| **Open Redirect Prober** | `tools/redirect_scanner.py` | Tests 15+ URL query parameters for unvalidated 3xx redirects |
| **Cookie & CSRF Auditor** | `tools/cookie_auditor.py` | Audits `Set-Cookie` for `HttpOnly`, `Secure`, and `SameSite` compliance |
| **CORS Misconfiguration** | `tools/cors_scanner.py` | Probes dynamic origin reflection and credential exposure |
| **JWT Token Inspector** | `tools/jwt_analyzer.py` | Audits JWT headers, flags algorithm `none`, and checks expiration |
| **Auth & IDOR Prober** | `tools/auth_prober.py` | Probes sensitive API routes to detect unauthenticated data leaks |

---

## 🚀 CLI Usage & Commands

### 1. Comprehensive Web Audit
Runs all diagnostics against the target and provides a formatted, colored security scorecard.

```bash
python3 packages/sentinel-py/sentinel.py audit https://example.com
```

**JSON Mode (For CI/CD Pipelines):**
```bash
python3 packages/sentinel-py/sentinel.py audit https://example.com --json
```

---

### 2. Discover API Endpoints & Attack Surface
Extracts API endpoints from web pages, JavaScript files, and public documentation definitions.

```bash
python3 packages/sentinel-py/sentinel.py endpoints https://example.com
```

**How It Works:**
1. Crawls root HTML for `<script src="...">` tags and inline API references.
2. Downloads and inspects client-side JavaScript bundles (`.js`) using AST regex patterns matching `fetch()`, `axios.get()`, and `/api/...` paths.
3. Probes standard OpenAPI / Swagger paths (`/openapi.json`, `/swagger.json`, `/api-docs`) and automatically parses path dictionaries.
4. Parses `robots.txt` for disallow directives.

---

### 3. Open Redirect Probing
Probes parameters (`?redirect=`, `?next=`, `?return_to=`, `?dest=`, `?url=`) for unvalidated redirects to external attacker domains.

```bash
python3 packages/sentinel-py/sentinel.py redirect https://example.com/login
```

---

### 4. Cookie Security & CSRF Auditor
Audits `Set-Cookie` headers for security best practices.

```bash
python3 packages/sentinel-py/sentinel.py cookies https://example.com
```

Checks for:
- ❌ Missing `HttpOnly` (Vulnerable to XSS session theft)
- ❌ Missing `Secure` flag on HTTPS connections
- ❌ Weak or missing `SameSite` (Vulnerable to Cross-Site Request Forgery)

---

### 5. CORS Misconfiguration Auditor
Tests CORS configuration by sending preflight and cross-origin probes.

```bash
python3 packages/sentinel-py/sentinel.py cors https://example.com
```

Detects:
- Arbitrary Origin Reflection: `Access-Control-Allow-Origin: https://evil.com`
- Null Origin Trust: `Access-Control-Allow-Origin: null`
- Credential Leakage: `Access-Control-Allow-Credentials: true` with wildcard or reflected origin

---

### 6. Forensic JWT Inspector
Inspects and diagnoses JSON Web Tokens without requiring third-party libraries.

```bash
python3 packages/sentinel-py/sentinel.py jwt <YOUR_JWT_TOKEN>
```

Flags:
- Insecure signature algorithm `"alg": "none"`
- Expired tokens (`exp` timestamp comparison against UTC)
- Header and payload claim inspection

---

### 7. Active Auth & IDOR Prober
Probes common sensitive endpoints to verify if authentication middleware is active.

```bash
python3 packages/sentinel-py/sentinel.py auth https://example.com --routes /api/admin,/api/users,/api/billing
```

---

## 🧪 Automated Testing

Sentinel Python Toolkit includes an automated test suite with an in-memory HTTP server fixture:

```bash
python3 -m unittest discover -s packages/sentinel-py/tests
```
