"""
Sensitive Files & Directory Exposure Prober
Tests target web applications for exposed secrets, Git repos, backup files, and debug endpoints.
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from typing import Dict, Any, List


COMMON_SENSITIVE_FILES = [
    {"path": "/.env", "name": "Environment Secrets File (.env)", "severity": "CRITICAL"},
    {"path": "/.git/HEAD", "name": "Exposed Git Repository (.git/HEAD)", "severity": "CRITICAL"},
    {"path": "/.git/config", "name": "Exposed Git Config (.git/config)", "severity": "HIGH"},
    {"path": "/.DS_Store", "name": "macOS Metadata (.DS_Store)", "severity": "LOW"},
    {"path": "/docker-compose.yml", "name": "Docker Compose Configuration", "severity": "HIGH"},
    {"path": "/Dockerfile", "name": "Docker Container Blueprint", "severity": "MEDIUM"},
    {"path": "/config.json", "name": "Application Config File", "severity": "HIGH"},
    {"path": "/backup.zip", "name": "Database/Source Code Backup", "severity": "CRITICAL"},
    {"path": "/backup.sql", "name": "SQL Database Dump Backup", "severity": "CRITICAL"},
    {"path": "/server.js.map", "name": "JavaScript Source Map", "severity": "MEDIUM"},
    {"path": "/swagger.json", "name": "Public Swagger API Spec", "severity": "LOW"},
    {"path": "/openapi.json", "name": "Public OpenAPI Definition", "severity": "LOW"},
    {"path": "/phpinfo.php", "name": "PHP Debug Info (phpinfo)", "severity": "HIGH"},
]


def audit_exposure(target_url: str, timeout: int = 5) -> Dict[str, Any]:
    """
    Probes for exposed files, secrets, and directories.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    findings: List[Dict[str, Any]] = []
    probes: List[Dict[str, Any]] = []

    for item in COMMON_SENSITIVE_FILES:
        probe_url = urllib.parse.urljoin(base_url, item["path"])
        req = urllib.request.Request(
            probe_url,
            headers={"User-Agent": "Sentinel-Exposure-Scanner/1.0"}
        )

        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
                status_code = response.status
                body = response.read(1024).decode('utf-8', errors='ignore')

                # Filter out standard 200 HTML SPAs returning 200 for 404s
                is_real_file = False
                if status_code == 200:
                    if item["path"] == "/.env" and ("=" in body or "SECRET" in body or "KEY" in body):
                        is_real_file = True
                    elif item["path"] == "/.git/HEAD" and "ref: refs/" in body:
                        is_real_file = True
                    elif item["path"] == "/.git/config" and "[core]" in body:
                        is_real_file = True
                    elif item["path"].endswith(".json") and (body.strip().startswith("{") or body.strip().startswith("[")):
                        is_real_file = True
                    elif item["path"] == "/phpinfo.php" and "PHP Version" in body:
                        is_real_file = True
                    elif "doctype html" not in body.lower():
                        is_real_file = True

                if is_real_file:
                    findings.append({
                        "file": item["path"],
                        "name": item["name"],
                        "url": probe_url,
                        "status": status_code,
                        "severity": item["severity"],
                        "title": f"Sensitive File Exposure: {item['name']}",
                        "message": f"File '{item['path']}' is publicly accessible over the internet without authentication.",
                        "remediation": f"Block public web server access to '{item['path']}' in your NGINX/Apache/Cloudflare config."
                    })

                probes.append({
                    "path": item["path"],
                    "status": status_code,
                    "exposed": is_real_file
                })
        except urllib.error.HTTPError as e:
            probes.append({
                "path": item["path"],
                "status": e.code,
                "exposed": False
            })
        except Exception as e:
            probes.append({
                "path": item["path"],
                "status": "ERROR",
                "exposed": False
            })

    return {
        "url": target_url,
        "total_probed": len(COMMON_SENSITIVE_FILES),
        "exposed_count": len(findings),
        "findings": findings,
        "probes": probes
    }
