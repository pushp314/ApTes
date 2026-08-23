"""
CORS Misconfiguration & Security Auditor
"""

import urllib.request
import urllib.error
import ssl
from typing import Dict, Any, List


def audit_cors(target_url: str, timeout: int = 10) -> Dict[str, Any]:
    """
    Audits CORS configurations by testing various Origin headers.
    """
    results: Dict[str, Any] = {
        "url": target_url,
        "vulnerable": False,
        "findings": [],
        "tested_origins": {},
    }

    test_origins = [
        "https://evil-attacker.com",
        "null",
        "https://subdomain." + target_url.split("//")[-1].split("/")[0],
    ]

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for origin in test_origins:
        req = urllib.request.Request(
            target_url,
            headers={
                "Origin": origin,
                "User-Agent": "Sentinel-Python-Security-Auditor/1.0",
            },
            method="OPTIONS",
        )

        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
                acao = response.headers.get("Access-Control-Allow-Origin")
                acac = response.headers.get("Access-Control-Allow-Credentials")
                
                status_entry = {
                    "acao": acao,
                    "acac": acac,
                    "status_code": response.status,
                }
                results["tested_origins"][origin] = status_entry

                # 1. Check for origin reflection
                if acao == origin:
                    results["vulnerable"] = True
                    results["findings"].append({
                        "severity": "CRITICAL" if acac == "true" else "HIGH",
                        "title": f"CORS Origin Reflection for '{origin}'",
                        "message": (
                            f"The server blindly reflects the requested Origin '{origin}' in "
                            f"Access-Control-Allow-Origin"
                            + (" with Access-Control-Allow-Credentials: true (Allows credential theft!)" if acac == "true" else ".")
                        ),
                        "remediation": "Do not dynamically reflect untrusted Origin headers. Use a strict domain whitelist."
                    })

                # 2. Check for null origin
                if origin == "null" and acao == "null":
                    results["vulnerable"] = True
                    results["findings"].append({
                        "severity": "HIGH",
                        "title": "CORS Trusts 'null' Origin",
                        "message": "The server allows requests from Origin: null, which can be exploited via sandboxed iframes.",
                        "remediation": "Never whitelist 'null' in Access-Control-Allow-Origin."
                    })

        except urllib.error.HTTPError as e:
            results["tested_origins"][origin] = {"status_code": e.code, "error": str(e)}
        except Exception as e:
            results["tested_origins"][origin] = {"error": str(e)}

    return results
