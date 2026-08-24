"""
Open Redirect Vulnerability Prober (High-Performance Parallel Engine)
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List


REDIRECT_PARAMS = [
    "redirect", "redirect_to", "url", "next", "target", "dest", "destination",
    "r", "u", "return", "return_url", "checkout_url", "continue", "forward", "go"
]

CANARY_DOMAIN = "example.com"
CANARY_PAYLOADS = [
    f"https://{CANARY_DOMAIN}",
    f"//{CANARY_DOMAIN}",
    f"/\\{CANARY_DOMAIN}",
]


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp
    http_error_301 = http_error_302
    http_error_303 = http_error_302
    http_error_307 = http_error_302
    http_error_308 = http_error_302


def _probe_single_redirect(task_args):
    param, payload, base_url, timeout, ctx = task_args
    query = {param: payload}
    probe_url = f"{base_url}?{urllib.parse.urlencode(query)}"

    req = urllib.request.Request(
        probe_url,
        headers={"User-Agent": "Sentinel-Redirect-Scanner/1.0"}
    )
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx), NoRedirectHandler)

    try:
        with opener.open(req, timeout=timeout) as response:
            loc = response.headers.get("Location", "")
            is_vuln = CANARY_DOMAIN in loc
            return {
                "param": param,
                "payload": payload,
                "url": probe_url,
                "status_code": response.status if hasattr(response, 'status') else getattr(response, 'code', 200),
                "location": loc,
                "vulnerable": is_vuln
            }
    except Exception:
        return None


def audit_open_redirect(target_url: str, params: List[str] = None, timeout: int = 3) -> Dict[str, Any]:
    """
    Probes for unvalidated open redirects concurrently.
    """
    if not params:
        params = REDIRECT_PARAMS

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    tasks = []
    for param in params:
        for payload in CANARY_PAYLOADS:
            tasks.append((param, payload, base_url, timeout, ctx))

    findings: List[Dict[str, Any]] = []
    probes: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(_probe_single_redirect, tasks)
        for res in results:
            if res:
                probes.append(res)
                if res["vulnerable"]:
                    findings.append({
                        "category": "Open Redirect",
                        "severity": "HIGH",
                        "title": f"Open Redirect in Parameter '{res['param']}'",
                        "message": f"Parameter '{res['param']}' accepted untrusted domain redirection to {res['location']}.",
                        "url": res["url"],
                        "curl_command": f"curl -i -X GET '{res['url']}'",
                        "remediation": "Validate redirect targets against an explicit allowlist or restrict to relative URL paths."
                    })

    return {
        "target_url": target_url,
        "is_vulnerable": len(findings) > 0,
        "total_probes_tested": len(probes),
        "findings": findings,
        "probes": probes
    }
