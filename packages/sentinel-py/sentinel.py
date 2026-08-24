#!/usr/bin/env python3
"""
Sentinel Python Security & Pentest Toolkit
A standalone, zero-dependency Python security scanner for web applications.
"""

import sys
import json
import argparse
from typing import Dict, Any

from tools.cors_scanner import audit_cors
from tools.jwt_analyzer import analyze_jwt
from tools.headers_scanner import audit_headers
from tools.auth_prober import probe_endpoints
from tools.api_finder import find_api_endpoints
from tools.redirect_scanner import audit_open_redirect
from tools.cookie_auditor import audit_cookies
from tools.exposure_scanner import audit_exposure
from tools.xss_scanner import audit_xss
from tools.admin_scanner import scan_admin_panels
from tools.subdomain_scanner import scan_subdomains
from tools.ssl_analyzer import audit_ssl
from tools.tech_fingerprinter import fingerprint_target
from tools.port_scanner import scan_ports
from tools.csp_analyzer import audit_csp


# ANSI Terminal Colors
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_banner():
    print(f"{Colors.BLUE}{Colors.BOLD}")
    print("  ========================================================")
    print("     🛡️  Sentinel Python Security & Pentest Toolkit")
    print("     Zero-Dependency Security Assessment Suite (15 Tools)")
    print("  ========================================================")
    print(f"{Colors.RESET}")


def run_full_audit(url: str, output_json: bool = False):
    if not output_json:
        print_banner()
        print(f"{Colors.CYAN}Target URL:{Colors.RESET} {url}\n")

    report: Dict[str, Any] = {
        "target": url,
        "overall_score": 100,
        "total_critical": 0,
        "total_warnings": 0,
        "headers": {},
        "csp": {},
        "ssl": {},
        "fingerprint": {},
        "cors": {},
        "cookies": {},
        "redirects": {},
        "exposure": {},
        "xss": {},
        "auth": {},
        "admin_discovery": {},
        "findings": [],
        "ai_verdict": ""
    }

    # 1. Headers Audit
    if not output_json:
        print(f"{Colors.BOLD}🔍 [1/10] Auditing HTTP Security Headers...{Colors.RESET}")
    header_res = audit_headers(url)
    report["headers"] = header_res
    if header_res.get("missing_headers"):
        for h in header_res["missing_headers"]:
            report["total_warnings"] += 1
            report["findings"].append({
                "category": "HTTP Headers",
                "severity": h["severity"],
                "title": f"Missing Security Header: {h['header']}",
                "message": f"Browser missing standard protection against {h['description']}.",
                "remediation": f"Configure web server to return '{h['header']}' response header."
            })
            if not output_json:
                print(f"     ❌ {Colors.RED}{h['header']}{Colors.RESET} ({h['severity']}) - {h['description']}")

    # 2. CSP Deep Audit
    if not output_json:
        print(f"\n{Colors.BOLD}🛡️  [2/10] Auditing Content-Security-Policy (CSP)...{Colors.RESET}")
    csp_res = audit_csp(url)
    report["csp"] = csp_res
    if csp_res.get("findings"):
        for f in csp_res["findings"]:
            if f["severity"] == "HIGH":
                report["total_critical"] += 1
            else:
                report["total_warnings"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 3. SSL/TLS Audit
    if not output_json:
        print(f"\n{Colors.BOLD}🔒 [3/10] Auditing SSL/TLS Transport Security...{Colors.RESET}")
    ssl_res = audit_ssl(url)
    report["ssl"] = ssl_res
    if ssl_res.get("findings"):
        for f in ssl_res["findings"]:
            if f["severity"] == "CRITICAL":
                report["total_critical"] += 1
            else:
                report["total_warnings"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 4. Tech Stack Fingerprinting
    if not output_json:
        print(f"\n{Colors.BOLD}🔍 [4/10] Fingerprinting Technology Stack...{Colors.RESET}")
    fp_res = fingerprint_target(url)
    report["fingerprint"] = fp_res
    if fp_res.get("findings"):
        for f in fp_res["findings"]:
            report["total_warnings"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ⚠️  {Colors.YELLOW}{f['title']}{Colors.RESET}: {f['message']}")

    # 5. CORS Audit
    if not output_json:
        print(f"\n{Colors.BOLD}🌐 [5/10] Auditing CORS Configuration...{Colors.RESET}")
    cors_res = audit_cors(url)
    report["cors"] = cors_res
    if cors_res.get("findings"):
        for f in cors_res["findings"]:
            report["total_critical"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 6. Cookie & CSRF Audit
    if not output_json:
        print(f"\n{Colors.BOLD}🍪 [6/10] Auditing Cookie Security & CSRF Protections...{Colors.RESET}")
    cookie_res = audit_cookies(url)
    report["cookies"] = cookie_res
    if cookie_res.get("findings"):
        for f in cookie_res["findings"]:
            report["total_warnings"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.YELLOW}{f['title']}{Colors.RESET}: {f['message']}")

    # 7. Open Redirect Audit
    if not output_json:
        print(f"\n{Colors.BOLD}🔀 [7/10] Probing for Open Redirect Vulnerabilities...{Colors.RESET}")
    redir_res = audit_open_redirect(url)
    report["redirects"] = redir_res
    if redir_res.get("findings"):
        for f in redir_res["findings"]:
            report["total_critical"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 8. Sensitive File Exposure
    if not output_json:
        print(f"\n{Colors.BOLD}📂 [8/10] Probing Sensitive File & Directory Exposure...{Colors.RESET}")
    exp_res = audit_exposure(url)
    report["exposure"] = exp_res
    if exp_res.get("findings"):
        for f in exp_res["findings"]:
            report["total_critical"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 9. Reflected XSS
    if not output_json:
        print(f"\n{Colors.BOLD}💉 [9/10] Probing Parameters for Reflected XSS...{Colors.RESET}")
    xss_res = audit_xss(url)
    report["xss"] = xss_res
    if xss_res.get("findings"):
        for f in xss_res["findings"]:
            report["total_critical"] += 1
            report["findings"].append(f)
            if not output_json:
                print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")

    # 10. Auth Probing
    if not output_json:
        print(f"\n{Colors.BOLD}🔓 [10/10] Probing Common API Routes for Unauthenticated Access...{Colors.RESET}")
    auth_res = probe_endpoints(url)
    report["auth"] = auth_res
    if auth_res.get("vulnerable_endpoints"):
        for ep in auth_res["vulnerable_endpoints"]:
            report["total_critical"] += 1
            report["findings"].append({
                "category": "Authentication",
                "severity": ep.get("severity", "CRITICAL"),
                "title": f"Unauthenticated Route Access: {ep['route']}",
                "route": ep["route"],
                "url": ep["url"],
                "status_code": ep["status_code"],
                "content_type": ep.get("content_type", "unknown"),
                "body_snippet": ep.get("body_snippet", ""),
                "curl_command": ep.get("curl_command", f"curl -i '{ep['url']}'"),
                "message": ep["message"],
                "remediation": ep["remediation"]
            })
            if not output_json:
                print(f"     ❌ {Colors.RED}{ep['route']}{Colors.RESET} (HTTP {ep['status_code']} OK without auth)")

    # Compute Overall Score
    score = 100 - (report["total_critical"] * 15) - (report["total_warnings"] * 3)
    report["overall_score"] = max(10, min(100, score))

    # Synthesize AI Verdict
    if report["total_critical"] > 0:
        verdict = f"HIGH RISK: The target application contains {report['total_critical']} severe vulnerabilities that could permit unauthorized data access, redirection, or server compromise. Immediate mitigation of open endpoints and sensitive file exposures is recommended."
    elif report["total_warnings"] > 0:
        verdict = f"MODERATE POSTURE: No critical exploits detected. However, {report['total_warnings']} security hardening gaps (missing HTTP headers or cookie flags) were identified. Apply defense-in-depth headers (CSP, HSTS, SameSite)."
    else:
        verdict = "EXCELLENT POSTURE: Target passed all 10 diagnostic security modules. Enforces strong access boundaries, proper cookie isolation, and resilient parameter sanitization."
    report["ai_verdict"] = verdict

    if not output_json:
        print(f"\n{Colors.BLUE}{Colors.BOLD}========================================================{Colors.RESET}")
        print(f"{Colors.GREEN}{Colors.BOLD}🛡️  Security Health Score: {report['overall_score']}/100{Colors.RESET}")
        print(f"{Colors.CYAN}🧠 AI Executive Verdict:{Colors.RESET} {verdict}\n")

    if output_json:
        print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="Sentinel Python Security & Pentest Toolkit",
        formatter_class=argparse.RawTextHelpFormatter
    )

    subparsers = parser.add_subparsers(dest="command", help="Available security tools")

    # Command: audit (Full web audit)
    audit_parser = subparsers.add_parser("audit", help="Run comprehensive audit across all 10 security vectors")
    audit_parser.add_argument("url", help="Target URL (e.g. https://example.com)")
    audit_parser.add_argument("--json", action="store_true", help="Output results as JSON")

    # Command: cors
    cors_parser = subparsers.add_parser("cors", help="Audit CORS misconfigurations")
    cors_parser.add_argument("url", help="Target URL to test")

    # Command: headers
    headers_parser = subparsers.add_parser("headers", help="Audit HTTP security headers")
    headers_parser.add_argument("url", help="Target URL to test")

    # Command: csp
    csp_parser = subparsers.add_parser("csp", help="Deeply audit Content-Security-Policy (CSP) directives")
    csp_parser.add_argument("url", help="Target URL to test")

    # Command: ssl
    ssl_parser = subparsers.add_parser("ssl", help="Inspect SSL/TLS certificates and cipher strength")
    ssl_parser.add_argument("target", help="Target domain or URL (e.g. example.com or https://example.com)")
    ssl_parser.add_argument("--port", type=int, default=443, help="Port to connect to (default: 443)")

    # Command: fingerprint
    fp_parser = subparsers.add_parser("fingerprint", help="Fingerprint web server and frameworks")
    fp_parser.add_argument("url", help="Target URL to fingerprint")

    # Command: subdomains
    sub_parser = subparsers.add_parser("subdomains", help="Enumerate subdomains via DNS discovery")
    sub_parser.add_argument("domain", help="Base domain or URL (e.g. example.com)")

    # Command: ports
    port_parser = subparsers.add_parser("ports", help="Scan common TCP ports and grab banners")
    port_parser.add_argument("host", help="Target hostname or IP (e.g. example.com)")

    # Command: jwt
    jwt_parser = subparsers.add_parser("jwt", help="Inspect and audit a JWT token")
    jwt_parser.add_argument("token", help="JWT token string")

    # Command: auth
    auth_parser = subparsers.add_parser("auth", help="Probe API endpoints for unauthenticated access")
    auth_parser.add_argument("url", help="Base URL of target application")
    auth_parser.add_argument("--routes", help="Comma-separated list of routes to probe (e.g. /api/admin,/api/users)")

    # Command: endpoints (API Discovery)
    endpoints_parser = subparsers.add_parser("endpoints", help="Discover API endpoints from HTML, JavaScript bundles, and Swagger specs")
    endpoints_parser.add_argument("url", help="Target website URL (e.g. https://example.com)")
    endpoints_parser.add_argument("--json", action="store_true", help="Output results as JSON")

    # Command: redirect
    redirect_parser = subparsers.add_parser("redirect", help="Probe parameters for open redirect vulnerabilities")
    redirect_parser.add_argument("url", help="Target URL to test")

    # Command: cookies
    cookie_parser = subparsers.add_parser("cookies", help="Audit Set-Cookie flags and CSRF protections")
    cookie_parser.add_argument("url", help="Target URL to test")

    # Command: exposure
    exp_parser = subparsers.add_parser("exposure", help="Probe sensitive files and leaked secrets (.env, .git, config)")
    exp_parser.add_argument("url", help="Target URL to test")

    # Command: xss
    xss_parser = subparsers.add_parser("xss", help="Probe parameters for Reflected XSS injection")
    xss_parser.add_argument("url", help="Target URL to test")

    # Command: admin (Admin Panel & Hidden API Discovery)
    admin_panel_parser = subparsers.add_parser("admin", help="Discover accessible admin panels and hidden API routes")
    admin_panel_parser.add_argument("url", help="Target URL to scan")
    admin_panel_parser.add_argument("--no-api", action="store_true", help="Skip hidden API route probing")
    admin_panel_parser.add_argument("--paths", help="Comma-separated custom paths to probe (e.g. /my-admin,/backoffice)")
    admin_panel_parser.add_argument("--json", action="store_true", help="Output results as JSON")

    # Command: dashboard
    subparsers.add_parser("dashboard", help="Launch the interactive Mission Control Dashboard")

    # Legacy / direct flag support
    parser.add_argument("--url", help="Direct target URL to run full audit on")
    parser.add_argument("--audit-all", action="store_true", help="Run full audit")

    args = parser.parse_args()

    if args.url and args.audit_all:
        run_full_audit(args.url)
        return

    if args.command == "dashboard" or not args.command:
        from tools.dashboard import run_interactive_dashboard
        run_interactive_dashboard()
        return

    if args.command == "audit":
        run_full_audit(args.url, output_json=args.json)
    elif args.command == "cors":
        res = audit_cors(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "headers":
        res = audit_headers(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "csp":
        res = audit_csp(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "ssl":
        res = audit_ssl(args.target, port=args.port)
        print(json.dumps(res, indent=2))
    elif args.command == "fingerprint":
        res = fingerprint_target(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "subdomains":
        res = scan_subdomains(args.domain)
        print(json.dumps(res, indent=2))
    elif args.command == "ports":
        res = scan_ports(args.host)
        print(json.dumps(res, indent=2))
    elif args.command == "cookies":
        res = audit_cookies(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "redirect":
        res = audit_open_redirect(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "exposure":
        res = audit_exposure(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "xss":
        res = audit_xss(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "jwt":
        try:
            res = analyze_jwt(args.token)
            print(json.dumps(res, indent=2))
        except Exception as e:
            print(f"{Colors.RED}Error:{Colors.RESET} {e}")
            sys.exit(1)
    elif args.command == "auth":
        routes = [r.strip() for r in args.routes.split(",")] if args.routes else None
        res = probe_endpoints(args.url, routes=routes)
        print(json.dumps(res, indent=2))
    elif args.command == "endpoints":
        res = find_api_endpoints(args.url)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            print_banner()
            print(f"{Colors.CYAN}Discovering API Endpoints for:{Colors.RESET} {args.url}...\n")
            print(f"📊 {Colors.BOLD}Discovered {res['total_endpoints_found']} API Endpoints:{Colors.RESET}")
            for ep in res["endpoints"]:
                print(f"  ⚡ {Colors.GREEN}{ep}{Colors.RESET}")
            if res.get("specs_discovered"):
                print(f"\n📑 {Colors.BOLD}Discovered API Documentation & Specs:{Colors.RESET}")
                for s in res["specs_discovered"]:
                    print(f"  👉 {Colors.YELLOW}{s['type']}{Colors.RESET}: {s['url']}")
            print(f"\n{Colors.BLUE}========================================================{Colors.RESET}")
    elif args.command == "admin":
        custom = [p.strip() for p in args.paths.split(",")] if args.paths else None
        res = scan_admin_panels(args.url, include_api=not args.no_api, custom_paths=custom)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            print_banner()
            print(f"{Colors.CYAN}Admin Panel & Hidden API Discovery for:{Colors.RESET} {args.url}\n")
            print(f"📊 {Colors.BOLD}Probed {res['total_probed']} paths{Colors.RESET}\n")
            if res['open_panels']:
                print(f"  🔓 {Colors.RED}{Colors.BOLD}OPEN ADMIN PANELS ({len(res['open_panels'])}):{Colors.RESET}")
                for p in res['open_panels']:
                    title = f" — {p['page_title']}" if p.get('page_title') else ''
                    print(f"     ❌ {Colors.RED}{p['path']}{Colors.RESET} (HTTP {p['status_code']}{title})")
            if res['open_apis']:
                print(f"\n  🔓 {Colors.RED}{Colors.BOLD}OPEN API ROUTES ({len(res['open_apis'])}):{Colors.RESET}")
                for p in res['open_apis']:
                    print(f"     ❌ {Colors.RED}{p['path']}{Colors.RESET} (HTTP {p['status_code']}, {p['content_type'] or 'unknown'})")
            if res['login_gates']:
                print(f"\n  🔐 {Colors.GREEN}LOGIN-GATED ({len(res['login_gates'])}):{Colors.RESET}")
                for p in res['login_gates']:
                    print(f"     ✅ {Colors.GREEN}{p['path']}{Colors.RESET} (has login form)")
            if res['protected']:
                print(f"\n  🛡️  {Colors.GREEN}PROTECTED 401/403 ({len(res['protected'])}):{Colors.RESET}")
                for p in res['protected']:
                    print(f"     ✅ {Colors.GREEN}{p['path']}{Colors.RESET} (HTTP {p['status_code']})")
            print(f"\n  📂 Not Found (404): {len(res['not_found'])} paths")
            print(f"  🔀 Redirects (3xx): {len(res['redirects'])} paths")
            print(f"  🖥️  SPA Fallbacks: {len(res['spa_fallbacks'])} paths")
            print(f"\n{Colors.BLUE}========================================================{Colors.RESET}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
