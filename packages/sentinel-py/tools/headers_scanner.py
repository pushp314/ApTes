"""
HTTP Security Headers Auditor
"""

import urllib.request
import urllib.error
import ssl
from typing import Dict, Any, List


REQUIRED_SECURITY_HEADERS = {
    "strict-transport-security": {
        "severity": "HIGH",
        "description": "Enforces secure HTTPS connections and prevents SSL stripping.",
        "recommendation": "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
    },
    "content-security-policy": {
        "severity": "HIGH",
        "description": "Restricts sources from which scripts, styles, and resources can load (mitigates XSS).",
        "recommendation": "Add: Content-Security-Policy with appropriate script-src, object-src, and default-src directives."
    },
    "x-frame-options": {
        "severity": "MEDIUM",
        "description": "Prevents site from being embedded in iframes (mitigates Clickjacking).",
        "recommendation": "Add: X-Frame-Options: DENY or SAMEORIGIN"
    },
    "x-content-type-options": {
        "severity": "MEDIUM",
        "description": "Prevents browsers from MIME-sniffing response types.",
        "recommendation": "Add: X-Content-Type-Options: nosniff"
    },
    "referrer-policy": {
        "severity": "LOW",
        "description": "Controls how much referrer information is included with requests.",
        "recommendation": "Add: Referrer-Policy: strict-origin-when-cross-origin"
    },
    "permissions-policy": {
        "severity": "LOW",
        "description": "Controls which browser features/APIs (camera, microphone, geolocation) can be used.",
        "recommendation": "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()"
    }
}


def audit_headers(target_url: str, timeout: int = 10) -> Dict[str, Any]:
    """
    Audits an HTTP/HTTPS endpoint for missing security headers.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        target_url,
        headers={"User-Agent": "Sentinel-Python-Security-Auditor/1.0"},
        method="HEAD",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            status_code = response.status
            raw_headers = {k.lower(): v for k, v in response.headers.items()}
    except urllib.error.HTTPError as e:
        status_code = e.code
        raw_headers = {k.lower(): v for k, v in e.headers.items()}
    except Exception as e:
        return {
            "url": target_url,
            "error": str(e),
            "status_code": 0,
            "missing_headers": [],
            "present_headers": {},
        }

    missing_headers = []
    for header, meta in REQUIRED_SECURITY_HEADERS.items():
        if header not in raw_headers:
            missing_headers.append({
                "header": header,
                "severity": meta["severity"],
                "description": meta["description"],
                "recommendation": meta["recommendation"],
            })

    return {
        "url": target_url,
        "status_code": status_code,
        "present_headers": raw_headers,
        "missing_headers": missing_headers,
        "score": max(0, 100 - (len(missing_headers) * 15)),
    }
