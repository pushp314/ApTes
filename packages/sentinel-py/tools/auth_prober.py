"""
API Access Control & Auth Bypass Prober
Probes sensitive endpoints and captures full HTTP forensic evidence.
"""

import urllib.request
import urllib.error
import ssl
from typing import Dict, Any, List


DEFAULT_SENSITIVE_ROUTES = [
    "/api/admin",
    "/api/admin/users",
    "/api/admin/settings",
    "/api/billing",
    "/api/dashboard",
    "/api/users",
    "/api/user/profile",
    "/api/keys",
    "/api/tokens",
    "/admin",
    "/settings",
]


def probe_endpoints(
    base_url: str,
    routes: List[str] = None,
    timeout: int = 5
) -> Dict[str, Any]:
    """
    Probes endpoints for missing authentication and captures forensic HTTP request/response evidence.
    """
    if not routes:
        routes = DEFAULT_SENSITIVE_ROUTES

    clean_base = base_url.rstrip("/")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    results: Dict[str, Any] = {
        "base_url": base_url,
        "probed_count": len(routes),
        "vulnerable_endpoints": [],
        "protected_endpoints": [],
        "not_found_endpoints": [],
        "spa_fallbacks": [],
    }

    for route in routes:
        clean_route = "/" + route.lstrip("/")
        target_url = f"{clean_base}{clean_route}"

        req = urllib.request.Request(
            target_url,
            headers={
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Sentinel-Forensic-Auditor/1.0",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
                status = response.status
                content_type = response.headers.get("Content-Type", "")
                raw_body = response.read(1024).decode('utf-8', errors='ignore')
                body_snippet = raw_body[:300].strip()

                is_html_spa = "text/html" in content_type.lower() and ("<!doctype html" in body_snippet.lower() or "<html" in body_snippet.lower())

                if 200 <= status < 300:
                    if is_html_spa and not clean_route.startswith("/api"):
                        # Client-side SPA routing fallback (e.g. Vite/Next.js root page)
                        results["spa_fallbacks"].append({
                            "route": clean_route,
                            "status_code": status,
                            "content_type": content_type,
                            "body_snippet": body_snippet
                        })
                    else:
                        results["vulnerable_endpoints"].append({
                            "route": clean_route,
                            "url": target_url,
                            "status_code": status,
                            "content_type": content_type,
                            "body_snippet": body_snippet,
                            "is_spa_fallback": is_html_spa,
                            "curl_command": f"curl -i -X GET '{target_url}'",
                            "severity": "CRITICAL" if "admin" in clean_route or "billing" in clean_route or "key" in clean_route else "HIGH",
                            "message": f"Endpoint responded with HTTP {status} OK without authentication (Content-Type: {content_type or 'unknown'}).",
                            "remediation": "Enforce backend authentication middleware (e.g. JWT token verification, session guard) to reject unauthenticated requests with HTTP 401/403."
                        })
                else:
                    results["protected_endpoints"].append({"route": clean_route, "status_code": status})
        except urllib.error.HTTPError as e:
            if e.code in [401, 403]:
                results["protected_endpoints"].append({"route": clean_route, "status_code": e.code})
            elif e.code == 404:
                results["not_found_endpoints"].append({"route": clean_route, "status_code": 404})
            else:
                results["protected_endpoints"].append({"route": clean_route, "status_code": e.code})
        except Exception:
            pass

    return results
