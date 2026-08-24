"""
SSL/TLS Certificate & Transport Security Auditor
Zero-dependency TLS inspector for cipher strength, certificate validity, and protocol security.
"""

import ssl
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Dict, Any


def audit_ssl(target: str, port: int = 443, timeout: int = 8) -> Dict[str, Any]:
    """
    Connects to the target over TLS and inspects certificate validity and cipher details.
    """
    if "://" in target:
        parsed = urlparse(target)
        hostname = parsed.hostname or target
        if parsed.port:
            port = parsed.port
    else:
        hostname = target
        if ":" in hostname:
            hostname, p = hostname.split(":", 1)
            port = int(p)

    results: Dict[str, Any] = {
        "target": target,
        "hostname": hostname,
        "port": port,
        "valid": False,
        "certificate": {},
        "findings": [],
    }

    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                version = ssock.version()

                results["valid"] = True
                results["tls_version"] = version
                results["cipher"] = {
                    "name": cipher[0] if cipher else None,
                    "protocol": cipher[1] if cipher else None,
                    "bits": cipher[2] if cipher else None
                }

                if cert:
                    # Expiration parsing
                    not_after_str = cert.get("notAfter")
                    not_before_str = cert.get("notBefore")
                    
                    if not_after_str:
                        not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        days_left = (not_after - datetime.now(timezone.utc)).days
                        results["certificate"]["expires_at"] = not_after.isoformat()
                        results["certificate"]["days_remaining"] = days_left

                        if days_left < 0:
                            results["findings"].append({
                                "severity": "CRITICAL",
                                "title": "SSL Certificate Expired",
                                "message": f"Certificate for {hostname} expired {abs(days_left)} days ago on {not_after_str}.",
                                "remediation": "Renew the SSL/TLS certificate immediately."
                            })
                        elif days_left < 15:
                            results["findings"].append({
                                "severity": "HIGH",
                                "title": "SSL Certificate Expiring Soon",
                                "message": f"Certificate for {hostname} expires in {days_left} days.",
                                "remediation": "Renew the SSL/TLS certificate before expiry to avoid service disruption."
                            })

                    # Subject & Issuer
                    subject = dict(x[0] for x in cert.get("subject", ()))
                    issuer = dict(x[0] for x in cert.get("issuer", ()))
                    results["certificate"]["subject"] = subject
                    results["certificate"]["issuer"] = issuer
                    results["certificate"]["san"] = [x[1] for x in cert.get("subjectAltName", ())]

                    # Self-signed check
                    if subject == issuer:
                        results["findings"].append({
                            "severity": "HIGH",
                            "title": "Self-Signed Certificate Detected",
                            "message": f"The certificate for {hostname} is self-signed and will trigger browser security warnings.",
                            "remediation": "Use a trusted Certificate Authority (e.g. Let's Encrypt, Cloudflare) for production."
                        })

                # Check old TLS versions
                if version in ["TLSv1", "TLSv1.1", "SSLv2", "SSLv3"]:
                    results["findings"].append({
                        "severity": "CRITICAL",
                        "title": f"Deprecated TLS Protocol: {version}",
                        "message": f"The server negotiates {version}, which is vulnerable to POODLE, BEAST, and Sweet32 attacks.",
                        "remediation": "Disable TLS 1.0/1.1 on your server and enforce TLS 1.2 or TLS 1.3 only."
                    })

    except ssl.SSLCertVerificationError as e:
        results["findings"].append({
            "severity": "HIGH",
            "title": "SSL Certificate Verification Failed",
            "message": f"TLS verification error: {str(e)}",
            "remediation": "Check certificate validity, hostname matching, and intermediate chain certificates."
        })
    except Exception as e:
        results["error"] = str(e)

    return results
