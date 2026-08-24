"""
Content Security Policy (CSP) Deep Analyzer
Parses and audits Content-Security-Policy headers for XSS, clickjacking, and injection bypasses.
"""

import urllib.request
import urllib.error
import ssl
from typing import Dict, Any, List


def parse_csp(header_val: str) -> Dict[str, List[str]]:
    directives: Dict[str, List[str]] = {}
    tokens = header_val.split(";")
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        parts = token.split()
        dir_name = parts[0].lower()
        sources = parts[1:]
        directives[dir_name] = sources
    return directives


def audit_csp(target_url: str, timeout: int = 8) -> Dict[str, Any]:
    """
    Fetches the target URL, extracts CSP headers, and evaluates security posture.
    """
    results: Dict[str, Any] = {
        "url": target_url,
        "has_csp": False,
        "raw_csp": None,
        "directives": {},
        "findings": [],
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        target_url,
        headers={"User-Agent": "Sentinel-CSP-Auditor/1.0 (Security Audit)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            csp_val = response.headers.get("Content-Security-Policy") or response.headers.get("content-security-policy")
            
            if not csp_val:
                results["findings"].append({
                    "severity": "HIGH",
                    "title": "Missing Content-Security-Policy (CSP) Header",
                    "message": "The application does not set a Content-Security-Policy header, leaving it vulnerable to Cross-Site Scripting (XSS) and data injection attacks.",
                    "remediation": "Configure a strict Content-Security-Policy header with nonce-based or hash-based script execution."
                })
                return results

            results["has_csp"] = True
            results["raw_csp"] = csp_val
            directives = parse_csp(csp_val)
            results["directives"] = directives

            # 1. Check script-src or default-src for unsafe-inline
            script_srcs = directives.get("script-src", directives.get("default-src", []))
            if "'unsafe-inline'" in script_srcs or "unsafe-inline" in script_srcs:
                results["findings"].append({
                    "severity": "HIGH",
                    "title": "CSP 'unsafe-inline' in script-src",
                    "message": "The CSP allows inline script execution ('unsafe-inline'), neutralizing primary XSS protections.",
                    "remediation": "Remove 'unsafe-inline' and use cryptographic nonces (nonce-...) or SHA-256 hashes."
                })

            # 2. Check for unsafe-eval
            if "'unsafe-eval'" in script_srcs or "unsafe-eval" in script_srcs:
                results["findings"].append({
                    "severity": "MEDIUM",
                    "title": "CSP 'unsafe-eval' Permitted",
                    "message": "The CSP allows eval() execution ('unsafe-eval'), increasing risk of DOM-based XSS execution.",
                    "remediation": "Refactor code to avoid eval() and remove 'unsafe-eval' from CSP."
                })

            # 3. Check for wildcard sources
            if "*" in script_srcs:
                results["findings"].append({
                    "severity": "HIGH",
                    "title": "CSP Wildcard '*' in script-src",
                    "message": "The CSP allows scripts from any origin (*), allowing attackers to load external payloads.",
                    "remediation": "Restrict script-src to explicit trusted CDNs and 'self'."
                })

            # 4. Check object-src
            object_srcs = directives.get("object-src", directives.get("default-src", []))
            if "'none'" not in object_srcs and "none" not in object_srcs:
                results["findings"].append({
                    "severity": "MEDIUM",
                    "title": "Missing object-src 'none' in CSP",
                    "message": "Plugins/Flash objects are not explicitly disabled in CSP.",
                    "remediation": "Add 'object-src 'none';' to your Content-Security-Policy."
                })

            # 5. Check frame-ancestors (Clickjacking)
            if "frame-ancestors" not in directives:
                results["findings"].append({
                    "severity": "MEDIUM",
                    "title": "Missing frame-ancestors Directive in CSP",
                    "message": "The application does not restrict embedding in iframes via frame-ancestors, risking clickjacking.",
                    "remediation": "Add 'frame-ancestors 'self';' or 'frame-ancestors 'none';' to CSP."
                })

    except Exception as e:
        results["error"] = str(e)

    return results
