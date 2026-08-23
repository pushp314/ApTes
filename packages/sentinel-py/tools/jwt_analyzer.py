"""
JWT Forensic & Security Analyzer
"""

import json
import base64
import time
from typing import Dict, Any, List


def _base64url_decode(input_str: str) -> bytes:
    rem = len(input_str) % 4
    if rem > 0:
        input_str += "=" * (4 - rem)
    return base64.urlsafe_b64decode(input_str)


def analyze_jwt(token: str) -> Dict[str, Any]:
    """
    Analyzes a JWT token for cryptographic and structural weaknesses.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format: Token must contain exactly 3 dot-separated parts.")

    warnings: List[Dict[str, str]] = []

    # 1. Decode Header
    try:
        header_raw = _base64url_decode(parts[0]).decode("utf-8")
        header = json.loads(header_raw)
    except Exception as e:
        header = {}
        warnings.append({"severity": "HIGH", "message": f"Failed to parse JWT Header: {e}"})

    # 2. Decode Payload
    try:
        payload_raw = _base64url_decode(parts[1]).decode("utf-8")
        payload = json.loads(payload_raw)
    except Exception as e:
        payload = {}
        warnings.append({"severity": "HIGH", "message": f"Failed to parse JWT Payload: {e}"})

    # 3. Check Algorithm Vulnerabilities
    alg = str(header.get("alg", "none")).lower()
    if alg in ["none", "null", ""]:
        warnings.append({
            "severity": "CRITICAL",
            "title": "Insecure Algorithm 'none'",
            "message": "Token specifies algorithm 'none'. Vulnerable backends may accept forged tokens with empty signatures.",
            "remediation": "Enforce strict algorithm verification (e.g. HS256, RS256) on the backend."
        })

    # 4. Check Expiration
    is_expired = False
    exp = payload.get("exp")
    if isinstance(exp, (int, float)):
        now = time.time()
        if now > exp:
            is_expired = True
            warnings.append({
                "severity": "MEDIUM",
                "title": "Expired Token",
                "message": f"Token expired at timestamp {exp} (Current: {int(now)}).",
                "remediation": "Do not accept expired tokens in authenticated sessions."
            })
    else:
        warnings.append({
            "severity": "LOW",
            "title": "Missing Expiration Claim",
            "message": "Token does not contain an 'exp' claim. It may be valid indefinitely.",
            "remediation": "Always set a short-lived 'exp' claim on generated JWT tokens."
        })

    return {
        "header": header,
        "payload": payload,
        "algorithm": header.get("alg"),
        "is_expired": is_expired,
        "warnings": warnings,
        "vulnerable": any(w.get("severity") in ["CRITICAL", "HIGH"] for w in warnings)
    }
