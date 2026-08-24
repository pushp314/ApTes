"""
Technology Fingerprinter & Information Leakage Detector
Analyzes headers, HTML structures, scripts, and cookies to fingerprint web stacks and detect version leaks.
"""

import urllib.request
import urllib.error
import ssl
import re
from typing import Dict, Any, List


TECH_PATTERNS = {
    "Next.js": [r"/_next/static", r"__NEXT_DATA__", r"x-nextjs-page"],
    "React": [r"react\.development\.js", r"react-dom", r"_reactRootContainer", r"data-reactroot"],
    "Vue.js": [r"vue\.runtime", r"data-v-[a-f0-9]+", r"__vue__"],
    "Angular": [r"ng-version", r"ng-app", r"angular\.min\.js"],
    "WordPress": [r"/wp-content/", r"/wp-includes/", r"wp-json"],
    "Laravel": [r"laravel_session", r"XSRF-TOKEN.*laravel"],
    "Django": [r"csrftoken.*django", r"__admin_media__"],
    "Express.js": [r"connect\.sid", r"express"],
    "Spring Boot": [r"whitelabel error page", r"org\.springframework"],
    "ASP.NET": [r"ASP\.NET_SessionId", r"__VIEWSTATE", r"X-AspNet-Version"],
    "Cloudflare": [r"cf-ray", r"__cfduid", r"cloudflare"],
    "Tailwind CSS": [r"tailwind", r"data-theme"],
    "Bootstrap": [r"bootstrap\.min\.css", r"bootstrap\.bundle"],
}


def fingerprint_target(target_url: str, timeout: int = 8) -> Dict[str, Any]:
    """
    Fetches the target URL and fingerprints server, technology stack, and information disclosure headers.
    """
    results: Dict[str, Any] = {
        "url": target_url,
        "detected_technologies": [],
        "server": None,
        "powered_by": None,
        "version_disclosures": [],
        "findings": [],
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        target_url,
        headers={"User-Agent": "Sentinel-Fingerprinter/1.0 (Security Recon)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            headers = dict(response.headers)
            body = response.read().decode("utf-8", errors="ignore")
            
            # Check Server header
            server = headers.get("Server") or headers.get("server")
            if server:
                results["server"] = server
                if re.search(r"\d+\.\d+", server):
                    results["version_disclosures"].append(f"Server: {server}")
                    results["findings"].append({
                        "severity": "LOW",
                        "title": f"Web Server Version Disclosure ({server})",
                        "message": f"Server response header exposes exact software version '{server}'.",
                        "remediation": "Configure web server tokens to 'Prod' or strip Server header."
                    })

            # Check X-Powered-By header
            powered_by = headers.get("X-Powered-By") or headers.get("x-powered-by")
            if powered_by:
                results["powered_by"] = powered_by
                results["version_disclosures"].append(f"X-Powered-By: {powered_by}")
                results["findings"].append({
                    "severity": "LOW",
                    "title": f"Technology Disclosure via X-Powered-By ({powered_by})",
                    "message": f"The response header 'X-Powered-By: {powered_by}' assists attackers in fingerprinting backend frameworks.",
                    "remediation": "Remove the X-Powered-By header from server configuration."
                })

            # Analyze Tech Patterns
            combined = body + " " + " ".join(f"{k}: {v}" for k, v in headers.items())
            for tech, patterns in TECH_PATTERNS.items():
                for pat in patterns:
                    if re.search(pat, combined, re.IGNORECASE):
                        if tech not in results["detected_technologies"]:
                            results["detected_technologies"].append(tech)
                        break

    except Exception as e:
        results["error"] = str(e)

    return results
