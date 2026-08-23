"""
Cookie Security & CSRF Protection Auditor
"""

import urllib.request
import urllib.error
import ssl
from typing import Dict, Any, List


def audit_cookies(target_url: str, timeout: int = 10) -> Dict[str, Any]:
    """
    Inspects Set-Cookie headers for HttpOnly, Secure, and SameSite attributes.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        target_url,
        headers={"User-Agent": "Sentinel-Cookie-Auditor/1.0"},
    )

    findings: List[Dict[str, Any]] = []
    cookies_found: List[Dict[str, Any]] = []

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            cookie_headers = response.headers.get_all("Set-Cookie") or []
            if not cookie_headers:
                raw_cookie = response.headers.get("Set-Cookie")
                if raw_cookie:
                    cookie_headers = [raw_cookie]

            for raw_c in cookie_headers:
                parts = [p.strip() for p in raw_c.split(";")]
                name_val = parts[0] if parts else ""
                c_name = name_val.split("=")[0] if "=" in name_val else name_val
                
                flags = [p.lower() for p in parts[1:]]
                has_httponly = any(f == "httponly" for f in flags)
                has_secure = any(f == "secure" for f in flags)
                samesite = next((f.split("=")[-1] for f in flags if f.startswith("samesite")), None)

                cookie_entry = {
                    "name": c_name,
                    "httponly": has_httponly,
                    "secure": has_secure,
                    "samesite": samesite,
                }
                cookies_found.append(cookie_entry)

                # 1. Missing HttpOnly
                if not has_httponly:
                    findings.append({
                        "cookie": c_name,
                        "severity": "HIGH",
                        "title": f"Cookie '{c_name}' Missing 'HttpOnly'",
                        "message": f"Cookie '{c_name}' is accessible via JavaScript (document.cookie), exposing it to theft via XSS.",
                        "remediation": f"Add 'HttpOnly' attribute to Set-Cookie: {c_name}=...; HttpOnly"
                    })

                # 2. Missing Secure flag
                if not has_secure and target_url.startswith("https"):
                    findings.append({
                        "cookie": c_name,
                        "severity": "HIGH",
                        "title": f"Cookie '{c_name}' Missing 'Secure' Flag",
                        "message": f"Cookie '{c_name}' transmitted over HTTPS lacks the 'Secure' attribute, risking transmission over plaintext HTTP.",
                        "remediation": f"Add 'Secure' attribute to Set-Cookie: {c_name}=...; Secure"
                    })

                # 3. Missing SameSite or SameSite=None (CSRF exposure)
                if not samesite or samesite.lower() == "none":
                    findings.append({
                        "cookie": c_name,
                        "severity": "MEDIUM",
                        "title": f"Cookie '{c_name}' Weak/Missing 'SameSite' (CSRF Risk)",
                        "message": f"Cookie '{c_name}' has SameSite={samesite or 'missing'}. It will be sent with cross-site requests, exposing state-changing actions to CSRF.",
                        "remediation": "Set 'SameSite=Lax' or 'SameSite=Strict' on all authenticated session cookies."
                    })

    except Exception as e:
        return {
            "url": target_url,
            "error": str(e),
            "cookies": [],
            "findings": [],
        }

    return {
        "url": target_url,
        "total_cookies": len(cookies_found),
        "cookies": cookies_found,
        "is_vulnerable": len(findings) > 0,
        "findings": findings,
    }
