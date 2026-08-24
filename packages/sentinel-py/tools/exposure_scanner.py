"""
Sensitive Files & Directory Exposure Prober (High-Performance Parallel Engine)
"""

import urllib.request
import urllib.error
import urllib.parse
import ssl
from concurrent.futures import ThreadPoolExecutor
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


def _probe_single_file(task_args):
    item, base_url, timeout, ctx = task_args
    probe_url = urllib.parse.urljoin(base_url, item["path"])
    req = urllib.request.Request(
        probe_url,
        headers={"User-Agent": "Sentinel-Exposure-Scanner/1.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            status_code = response.status
            body = response.read(1024).decode('utf-8', errors='ignore')
            content_type = response.headers.get("Content-Type", "")

            is_real_file = False
            if status_code == 200:
                if item["path"] == "/.env" and ("=" in body or "SECRET" in body or "KEY" in body):
                    is_real_file = True
                elif item["path"] == "/.git/HEAD" and "ref: refs/" in body:
                    is_real_file = True
                elif item["path"] == "/.git/config" and "[core]" in body:
                    is_real_file = True
                elif item["path"] in ["/swagger.json", "/openapi.json", "/config.json"] and "json" in content_type:
                    is_real_file = True
                elif item["path"] == "/docker-compose.yml" and "version:" in body:
                    is_real_file = True
                elif item["path"] == "/phpinfo.php" and "PHP Version" in body:
                    is_real_file = True
                elif item["path"] in ["/backup.zip", "/backup.sql"] and status_code == 200 and "html" not in content_type:
                    is_real_file = True

            return {
                "path": item["path"],
                "name": item["name"],
                "status_code": status_code,
                "url": probe_url,
                "exposed": is_real_file,
                "severity": item["severity"],
                "content_type": content_type,
                "evidence": body[:150] if is_real_file else ""
            }
    except Exception:
        return None


def audit_exposure(target_url: str, timeout: int = 3) -> Dict[str, Any]:
    """
    Probes for exposed files, secrets, and directories concurrently.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    parsed = urllib.parse.urlparse(target_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    tasks = [(item, base_url, timeout, ctx) for item in COMMON_SENSITIVE_FILES]
    findings: List[Dict[str, Any]] = []
    probes: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(_probe_single_file, tasks)
        for res in results:
            if res:
                probes.append(res)
                if res["exposed"]:
                    findings.append({
                        "category": "Sensitive Data Exposure",
                        "severity": res["severity"],
                        "title": f"Sensitive Asset Exposure: {res['name']}",
                        "message": f"Asset {res['path']} is publicly accessible without authorization.",
                        "url": res["url"],
                        "curl_command": f"curl -i -X GET '{res['url']}'",
                        "remediation": f"Block public web server access to {res['path']} in your reverse proxy / web server config."
                    })

    return {
        "target_url": target_url,
        "total_probes_tested": len(probes),
        "exposed_count": len(findings),
        "findings": findings,
        "probes": probes
    }
