"""
Reflected XSS & Content Injection Prober
Tests target query parameters for unescaped HTML/JavaScript reflection.
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from typing import Dict, Any, List


XSS_PROBES = [
    {"payload": "<sEntInEl1337>xss", "check": "<sEntInEl1337>xss", "type": "HTML Tag Injection"},
    {"payload": "\"><sEntInEl1337>", "check": "\"><sEntInEl1337>", "type": "Attribute Breakout"},
    {"payload": "javascript:alert('sentinel')", "check": "javascript:alert('sentinel')", "type": "URI Scheme Injection"},
]

COMMON_XSS_PARAMS = [
    "q", "search", "query", "s", "keyword", "name", "email", "id", "msg", "error", "callback"
]


def audit_xss(target_url: str, params: List[str] = None, timeout: int = 5) -> Dict[str, Any]:
    """
    Probes parameters for Reflected XSS.
    """
    if not params:
        params = COMMON_XSS_PARAMS

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    findings: List[Dict[str, Any]] = []
    tested_probes: List[Dict[str, Any]] = []

    for param in params:
        for probe in XSS_PROBES:
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
                    tested_probes.append({
                        "param": param,
                        "type": probe["type"],
                        "reflected": is_reflected,
                        "status": response.status
                    })

                    if is_reflected:
                        findings.append({
                            "param": param,
                            "probe_type": probe["type"],
                            "probe_url": probe_url,
                            "severity": "HIGH",
                            "title": f"Reflected XSS via Parameter '{param}'",
                            "message": f"Parameter '{param}' reflected unescaped HTML payload '{probe['check']}' into the response body.",
                            "remediation": "Apply contextual HTML/Attribute encoding (e.g. DOMPurify or framework auto-escaping) before rendering user input."
                        })
            except Exception:
                pass

    return {
        "url": target_url,
        "total_probes": len(tested_probes),
        "vulnerable_count": len(findings),
        "findings": findings,
        "probes": tested_probes
    }
