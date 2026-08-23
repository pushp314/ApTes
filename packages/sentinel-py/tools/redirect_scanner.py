"""
Open Redirect Web Prober
Tests target endpoints and parameters for unvalidated 3xx redirects to external domains.
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from typing import Dict, Any, List


COMMON_REDIRECT_PARAMS = [
    "redirect",
    "redirect_url",
    "redirect_uri",
    "next",
    "url",
    "dest",
    "destination",
    "target",
    "r",
    "u",
    "return_to",
    "return_url",
    "out",
    "view",
]

TEST_TARGET_DOMAIN = "https://evil-attacker.com"


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp
    http_error_301 = http_error_302
    http_error_303 = http_error_302
    http_error_307 = http_error_302
    http_error_308 = http_error_302


def audit_open_redirect(target_url: str, params: List[str] = None, timeout: int = 5) -> Dict[str, Any]:
    """
    Probes query parameters for unvalidated open redirects.
    """
    if not params:
        params = COMMON_REDIRECT_PARAMS

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    opener = urllib.request.build_opener(NoRedirectHandler)

    parsed = urllib.parse.urlparse(target_url)
    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    results: Dict[str, Any] = {
        "target": target_url,
        "vulnerable_params": [],
        "tested_params": len(params),
    }

    for param in params:
        probe_query = {param: TEST_TARGET_DOMAIN}
        probe_url = f"{base}?{urllib.parse.urlencode(probe_query)}"

        req = urllib.request.Request(
            probe_url,
            headers={"User-Agent": "Sentinel-Redirect-Auditor/1.0"},
        )

        try:
            resp = opener.open(req, timeout=timeout)
            location = resp.headers.get("Location") if hasattr(resp, "headers") else None
            
            if location and (TEST_TARGET_DOMAIN in location or "evil-attacker.com" in location):
                results["vulnerable_params"].append({
                    "param": param,
                    "probe_url": probe_url,
                    "location_header": location,
                    "severity": "HIGH",
                    "title": f"Open Redirect via Parameter '{param}'",
                    "message": f"Endpoint directly redirects to untrusted external destination '{location}'.",
                    "remediation": "Validate redirect targets against an approved domain whitelist or restrict redirects to relative paths."
                })
        except Exception:
            pass

    return {
        "url": target_url,
        "is_vulnerable": len(results["vulnerable_params"]) > 0,
        "findings": results["vulnerable_params"],
    }
