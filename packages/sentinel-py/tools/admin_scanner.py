"""
Admin Panel & Hidden API Route Discovery Scanner (High-Performance Parallel Engine)

Defensive auditing tool that probes common administrative panel paths, CMS dashboards,
database management UIs, and hidden API prefixes to verify access control enforcement.
Reports whether each discovered route is:
  - OPEN (accessible without credentials — authentication bypass risk)
  - PROTECTED (returns 401/403 — properly gated)
  - NOT_FOUND (returns 404 — not deployed)
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional


# ──────────────────────────────────────────────────────────────────────────────
# Common Admin Panel Paths (CMS, Frameworks, Database UIs, DevOps Panels)
# ──────────────────────────────────────────────────────────────────────────────
ADMIN_PANEL_PATHS = [
    # Generic
    "/admin", "/admin/", "/administrator", "/admin/login", "/admin/dashboard",
    "/admin-panel", "/adminpanel", "/admin-console", "/admin/console",
    "/dashboard", "/dashboard/admin", "/management", "/manage",
    "/controlpanel", "/cp", "/panel",

    # CMS-Specific
    "/wp-admin", "/wp-admin/", "/wp-login.php",
    "/ghost", "/ghost/signin",
    "/drupal/admin", "/user/login",
    "/joomla/administrator",
    "/umbraco",
    "/sitefinity",
    "/sitecore/login",

    # Database / DevOps Admin UIs
    "/phpmyadmin", "/pma", "/adminer", "/adminer.php",
    "/pgadmin", "/pgadmin4",
    "/mongo-express", "/redis-commander",
    "/kibana", "/grafana", "/grafana/login",
    "/prometheus", "/prometheus/targets",
    "/portainer", "/traefik", "/traefik/dashboard",
    "/jenkins", "/jenkins/login",
    "/sonarqube", "/sonar",
    "/mailhog", "/maildev",
    "/flower",

    # Cloud & Infrastructure
    "/console", "/cloud-console",
    "/status", "/health", "/healthz", "/readyz",
    "/_debugbar", "/__debug__",
    "/server-status", "/server-info",
    "/elmah.axd", "/trace.axd",

    # Framework-Specific
    "/rails/info", "/rails/mailers",
    "/django-admin", "/djadmin",
    "/laravel-admin",
    "/_next", "/_next/data",
    "/actuator", "/actuator/env", "/actuator/health", "/actuator/beans",
    "/swagger-ui", "/swagger-ui/", "/api-docs",
    "/graphql", "/graphiql", "/playground",
]


# ──────────────────────────────────────────────────────────────────────────────
# Hidden / Internal API Route Prefixes
# ──────────────────────────────────────────────────────────────────────────────
HIDDEN_API_PATHS = [
    "/api", "/api/v1", "/api/v2", "/api/v3",
    "/api/internal", "/api/private", "/api/debug",
    "/api/admin", "/api/admin/users", "/api/admin/config",
    "/api/admin/settings", "/api/admin/roles",
    "/api/users", "/api/user", "/api/user/me",
    "/api/accounts", "/api/account",
    "/api/billing", "/api/payments", "/api/subscriptions",
    "/api/keys", "/api/tokens", "/api/secrets",
    "/api/config", "/api/settings", "/api/env",
    "/api/logs", "/api/audit-log", "/api/events",
    "/api/webhooks", "/api/integrations",
    "/api/upload", "/api/files", "/api/media",
    "/api/search", "/api/export", "/api/import",
    "/api/reports", "/api/analytics", "/api/metrics",
    "/api/notifications", "/api/emails",
    "/internal/api", "/internal/health",
    "/private/api", "/debug/api",
    "/rest/api", "/rest/v1", "/rest/v2",
    "/jsonapi", "/odata",
]


def _classify_response(status: int, content_type: str, body: str, path: str) -> str:
    """Classify a response as OPEN, SPA_FALLBACK, PROTECTED, or NOT_FOUND."""
    is_html = "text/html" in content_type.lower()
    is_spa = is_html and (
        "<!doctype html" in body.lower() or
        "<html" in body.lower()
    ) and (
        "id=\"root\"" in body.lower() or
        "id=\"app\"" in body.lower() or
        "id=\"__next\"" in body.lower() or
        "<script" in body.lower()
    )

    if 200 <= status < 300:
        if is_spa and not path.startswith("/api"):
            return "SPA_FALLBACK"
        return "OPEN"
    elif status in (301, 302, 307, 308):
        return "REDIRECT"
    elif status in (401, 403):
        return "PROTECTED"
    elif status == 404:
        return "NOT_FOUND"
    else:
        return "OTHER"


def _probe_single_path(task_args):
    """Probe a single path and return structured forensic data."""
    path, base_url, timeout, ctx, category = task_args
    clean_path = "/" + path.lstrip("/")
    target_url = f"{base_url}{clean_path}"

    req = urllib.request.Request(
        target_url,
        headers={
            "Accept": "text/html, application/json, */*",
            "User-Agent": "Sentinel-Admin-Discovery/1.0",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "")
            raw_body = response.read(2048).decode("utf-8", errors="ignore")
            body_snippet = raw_body[:500].strip()

            # Extract page title if HTML
            title_match = re.search(r'<title[^>]*>(.*?)</title>', raw_body, re.IGNORECASE | re.DOTALL)
            page_title = title_match.group(1).strip() if title_match else ""

            # Check for login forms
            has_login_form = bool(re.search(
                r'(type=["\']password["\']|name=["\']password["\']|Login|Sign\s*in|Authenticate)',
                raw_body, re.IGNORECASE
            ))

            classification = _classify_response(status, content_type, body_snippet, clean_path)

            return {
                "path": clean_path,
                "url": target_url,
                "status_code": status,
                "content_type": content_type,
                "classification": classification,
                "category": category,
                "page_title": page_title,
                "has_login_form": has_login_form,
                "body_snippet": body_snippet[:300],
                "curl_command": f"curl -i -X GET '{target_url}'",
            }

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read(512).decode("utf-8", errors="ignore")
        except Exception:
            pass

        classification = _classify_response(e.code, "", body, clean_path)

        return {
            "path": clean_path,
            "url": target_url,
            "status_code": e.code,
            "content_type": "",
            "classification": classification,
            "category": category,
            "page_title": "",
            "has_login_form": False,
            "body_snippet": body[:300] if body else "",
            "curl_command": f"curl -i -X GET '{target_url}'",
        }

    except Exception:
        return None


def scan_admin_panels(
    target_url: str,
    include_api: bool = True,
    custom_paths: Optional[List[str]] = None,
    timeout: int = 4,
) -> Dict[str, Any]:
    """
    Scans a target website for accessible admin panels and hidden API routes.

    Args:
        target_url:    Base URL of the target (e.g. https://example.com)
        include_api:   Also probe hidden API route prefixes (default True)
        custom_paths:  Optional additional paths to probe
        timeout:       Request timeout in seconds

    Returns:
        Structured report with open/protected/not_found classifications
    """
    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # Build task list
    tasks = []
    for path in ADMIN_PANEL_PATHS:
        tasks.append((path, base_url, timeout, ctx, "admin_panel"))

    if include_api:
        for path in HIDDEN_API_PATHS:
            tasks.append((path, base_url, timeout, ctx, "hidden_api"))

    if custom_paths:
        for path in custom_paths:
            tasks.append((path, base_url, timeout, ctx, "custom"))

    # Classify results
    results = {
        "target_url": target_url,
        "base_url": base_url,
        "total_probed": len(tasks),
        "open_panels": [],         # Accessible without auth — potential risk
        "login_gates": [],         # Has login form — properly gated
        "protected": [],           # 401/403 — access denied
        "spa_fallbacks": [],       # SPA catch-all router, not a real panel
        "redirects": [],           # 3xx redirects
        "not_found": [],           # 404
        "open_apis": [],           # API routes accessible without auth
        "findings": [],            # Aggregated security findings for dashboard
    }

    with ThreadPoolExecutor(max_workers=15) as executor:
        probe_results = executor.map(_probe_single_path, tasks)

        for res in probe_results:
            if not res:
                continue

            cls = res["classification"]

            if cls == "OPEN":
                if res["has_login_form"]:
                    results["login_gates"].append(res)
                elif res["category"] == "hidden_api":
                    results["open_apis"].append(res)
                    results["findings"].append({
                        "category": "Hidden API Exposure",
                        "severity": "CRITICAL" if any(k in res["path"] for k in ["/admin", "/keys", "/tokens", "/secrets", "/billing", "/config", "/env"]) else "HIGH",
                        "title": f"Unprotected API Route: {res['path']}",
                        "url": res["url"],
                        "route": res["path"],
                        "status_code": res["status_code"],
                        "content_type": res["content_type"],
                        "body_snippet": res["body_snippet"],
                        "curl_command": res["curl_command"],
                        "message": f"API endpoint {res['path']} responded with HTTP {res['status_code']} without authentication (Content-Type: {res['content_type'] or 'unknown'}).",
                        "remediation": "Enforce backend authentication middleware (JWT/session/API key verification) to reject unauthenticated requests with HTTP 401/403.",
                    })
                else:
                    results["open_panels"].append(res)
                    results["findings"].append({
                        "category": "Admin Panel Exposure",
                        "severity": "CRITICAL",
                        "title": f"Accessible Admin Panel: {res['path']}",
                        "url": res["url"],
                        "route": res["path"],
                        "status_code": res["status_code"],
                        "content_type": res["content_type"],
                        "page_title": res["page_title"],
                        "body_snippet": res["body_snippet"],
                        "curl_command": res["curl_command"],
                        "message": f"Admin panel at {res['path']} is publicly accessible without login (HTTP {res['status_code']}, title: '{res['page_title']}').",
                        "remediation": "Restrict admin panel access via IP allowlisting, VPN-only access, or multi-factor authentication. Never expose admin UIs on public internet without auth gates.",
                    })

            elif cls == "SPA_FALLBACK":
                results["spa_fallbacks"].append(res)

            elif cls == "REDIRECT":
                results["redirects"].append(res)

            elif cls == "PROTECTED":
                results["protected"].append(res)

            elif cls == "NOT_FOUND":
                results["not_found"].append(res)

    return results
