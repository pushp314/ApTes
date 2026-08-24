"""
Reflected XSS & Content Injection Prober (High-Performance Parallel Engine)
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List


XSS_PROBES = [
    {"payload": "<sEntInEl1337>xss", "check": "<sEntInEl1337>xss", "type": "HTML Tag Injection"},
    {"payload": "\"><sEntInEl1337>", "check": "\"><sEntInEl1337>", "type": "Attribute Breakout"},
    {"payload": "javascript:alert('sentinel')", "check": "javascript:alert('sentinel')", "type": "URI Scheme Injection"},
]

COMMON_XSS_PARAMS = [
    "q", "search", "query", "s", "keyword", "name", "email", "id", "msg", "error", "callback"
]


def _probe_single_xss(task_args):
    param, probe, base_url, timeout, ctx = task_args
    query = {param: probe["payload"]}
    probe_url = f"{base_url}?{urllib.parse.urlencode(query)}"

    req = urllib.request.Request(
        probe_url,
        headers={"User-Agent": "Sentinel-XSS-Scanner/1.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            body = response.read(65536).decode('utf-8', errors='ignore')
            is_reflected = probe["check"] in body
            return {
                "param": param,
                "type": probe["type"],
                "reflected": is_reflected,
                "status": response.status,
                "url": probe_url,
                "payload": probe["payload"],
                "evidence": body[:200] if is_reflected else ""
            }
    except Exception:
        return None


def audit_xss(target_url: str, params: List[str] = None, timeout: int = 3) -> Dict[str, Any]:
    """
    Probes parameters for Reflected XSS concurrently.
    """
    if not params:
        params = COMMON_XSS_PARAMS

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    tasks = []
    for param in params:
        for probe in XSS_PROBES:
            tasks.append((param, probe, base_url, timeout, ctx))

    findings: List[Dict[str, Any]] = []
    tested_probes: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(_probe_single_xss, tasks)
        for res in results:
            if res:
                tested_probes.append(res)
                if res["reflected"]:
                    findings.append({
                        "category": "Cross-Site Scripting (XSS)",
                        "severity": "CRITICAL",
                        "title": f"Reflected XSS in Parameter '{res['param']}'",
                        "message": f"Parameter '{res['param']}' reflected unescaped payload via {res['type']}.",
                        "url": res["url"],
                        "curl_command": f"curl -i -X GET '{res['url']}'",
                        "remediation": f"Sanitize and contextually HTML-encode user input in parameter '{res['param']}'."
                    })

    return {
        "target_url": target_url,
        "total_probes_tested": len(tested_probes),
        "vulnerable_count": len(findings),
        "findings": findings,
        "probes": tested_probes
    }
