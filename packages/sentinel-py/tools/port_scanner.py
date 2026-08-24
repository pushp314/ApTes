"""
Lightweight TCP Port & Service Exposure Scanner
Zero-dependency multithreaded port scanner with banner grabbing for common application ports.
"""

import socket
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List


COMMON_PORTS = [
    (21, "FTP"),
    (22, "SSH"),
    (23, "Telnet"),
    (25, "SMTP"),
    (53, "DNS"),
    (80, "HTTP"),
    (110, "POP3"),
    (143, "IMAP"),
    (443, "HTTPS"),
    (445, "SMB"),
    (1433, "MSSQL"),
    (1521, "Oracle"),
    (2049, "NFS"),
    (3000, "Node/React Dev"),
    (3306, "MySQL"),
    (3389, "RDP"),
    (5000, "Flask/FastAPI"),
    (5432, "PostgreSQL"),
    (6379, "Redis"),
    (8000, "Django/HTTP-Alt"),
    (8080, "HTTP-Proxy/Tomcat"),
    (8443, "HTTPS-Alt"),
    (8888, "Jupyter"),
    (9000, "SonarQube/PHP-FPM"),
    (9200, "Elasticsearch"),
    (11211, "Memcached"),
    (27017, "MongoDB"),
]


def probe_port(host: str, port: int, service: str, timeout: float = 1.5) -> Dict[str, Any] | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            if s.connect_ex((host, port)) == 0:
                banner = ""
                try:
                    s.sendall(b"\r\n")
                    banner = s.recv(128).decode("utf-8", errors="ignore").strip()
                except Exception:
                    pass

                return {
                    "port": port,
                    "service": service,
                    "state": "open",
                    "banner": banner if banner else None
                }
    except (socket.error, OSError):
        pass
    return None


def scan_ports(target: str, max_workers: int = 30) -> Dict[str, Any]:
    """
    Scans common application, database, and admin ports against the target host.
    """
    if "://" in target:
        parsed = urlparse(target)
        host = parsed.hostname or target
    else:
        host = target.split(":")[0]

    results: Dict[str, Any] = {
        "target": target,
        "host": host,
        "open_ports": [],
        "findings": [],
    }

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(probe_port, host, port, service) for port, service in COMMON_PORTS]
        for future in as_completed(futures):
            res = future.result()
            if res:
                results["open_ports"].append(res)

    results["open_ports"].sort(key=lambda x: x["port"])

    # High-risk open port heuristics (Databases and Unencrypted Management exposed to internet)
    dangerous_ports = {
        3306: "MySQL Database",
        5432: "PostgreSQL Database",
        6379: "Redis In-Memory Database",
        27017: "MongoDB Database",
        9200: "Elasticsearch Cluster",
        11211: "Memcached Cache",
        23: "Telnet (Unencrypted)",
        445: "SMB File Sharing",
    }

    for item in results["open_ports"]:
        p = item["port"]
        if p in dangerous_ports:
            results["findings"].append({
                "severity": "CRITICAL" if p in [6379, 27017, 9200, 3306, 5432] else "HIGH",
                "title": f"Exposed Database/Service Port: {p} ({dangerous_ports[p]})",
                "message": f"Port {p} ({item['service']}) is open and directly accessible from the public internet.",
                "remediation": f"Block port {p} at firewall level and bind service to 127.0.0.1 or VPC private subnet only."
            })

    return results
