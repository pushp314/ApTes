"""
API Access Control & Auth Bypass Prober
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
    Probes endpoints for missing authentication and access control enforcement.
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
    }

    for route in routes:
        clean_route = "/" + route.lstrip("/")
        target_url = f"{clean_base}{clean_route}"

        req = urllib.request.Request(
            target_url,
            headers={
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Sentinel-Python-Security-Auditor/1.0",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
                status = response.status
                if 200 <= status < 300:
                    results["vulnerable_endpoints"].append({
                        "route": clean_route,
                        "url": target_url,
                        "status_code": status,
                        "severity": "CRITICAL" if "admin" in clean_route or "billing" in clean_route else "HIGH",
                        "message": f"Endpoint responded with HTTP {status} OK without authentication credentials.",
                        "remediation": "Apply authentication middleware (e.g. JWT token verification, session check) to this route."
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
            # Ignore network timeouts / unreachable endpoints
            pass

    return results
