"""
Subdomain Discovery & Enumeration Scanner
Zero-dependency fast DNS enumeration using standard library multithreading.
"""

import socket
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List


COMMON_SUBDOMAINS = [
    "www", "api", "dev", "stage", "staging", "test", "testing", "admin", "app",
    "auth", "login", "sso", "portal", "internal", "vpn", "mail", "email",
    "docs", "status", "dashboard", "graphql", "backend", "ws", "cdn", "assets",
    "static", "beta", "demo", "sandbox", "corp", "jenkins", "gitlab", "git",
    "k8s", "monitor", "monitoring", "grafana", "prometheus", "sentry", "vault",
    "db", "database", "redis", "elastic", "logs", "metrics", "payments",
    "billing", "webhook", "webhooks", "gateway", "proxy", "oauth", "mcp"
]


def check_subdomain(sub: str, domain: str) -> Dict[str, Any] | None:
    fqdn = f"{sub}.{domain}"
    try:
        ip = socket.gethostbyname(fqdn)
        return {
            "subdomain": sub,
            "fqdn": fqdn,
            "ip": ip,
            "status": "alive"
        }
    except (socket.gaierror, socket.herror, OSError):
        return None


def scan_subdomains(target: str, max_workers: int = 20) -> Dict[str, Any]:
    """
    Enumerates subdomains for the provided URL or base domain.
    """
    if "://" in target:
        parsed = urlparse(target)
        hostname = parsed.hostname or target
    else:
        hostname = target

    # Strip port if present
    if ":" in hostname:
        hostname = hostname.split(":")[0]

    # Extract base domain (e.g. app.example.com -> example.com)
    parts = hostname.split(".")
    if len(parts) >= 2:
        domain = ".".join(parts[-2:])
    else:
        domain = hostname

    results: Dict[str, Any] = {
        "target": target,
        "base_domain": domain,
        "discovered": [],
        "total_checked": len(COMMON_SUBDOMAINS),
        "total_found": 0,
        "findings": []
    }

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(check_subdomain, sub, domain): sub for sub in COMMON_SUBDOMAINS}
        for future in as_completed(futures):
            res = future.result()
            if res:
                results["discovered"].append(res)

    results["total_found"] = len(results["discovered"])

    # Analyze for exposed sensitive subdomains
    sensitive_prefixes = {"admin", "internal", "dev", "stage", "staging", "test", "k8s", "jenkins", "grafana", "db", "vault"}
    for item in results["discovered"]:
        sub = item["subdomain"]
        if sub in sensitive_prefixes:
            results["findings"].append({
                "severity": "HIGH" if sub in {"admin", "vault", "db", "k8s", "jenkins"} else "MEDIUM",
                "title": f"Sensitive Subdomain Discovered: {item['fqdn']}",
                "message": f"Pre-production or internal infrastructure subdomain '{item['fqdn']}' resolves to {item['ip']}.",
                "remediation": f"Ensure {item['fqdn']} is restricted via VPN/IP allowlisting and not publicly resolvable.",
                "location": item["fqdn"]
            })

    return results
