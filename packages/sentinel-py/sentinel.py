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
    print("     Zero-Dependency Security Assessment Suite")
    print("  ========================================================")
    print(f"{Colors.RESET}")


def run_full_audit(url: str, output_json: bool = False):
    print_banner()
    print(f"{Colors.CYAN}Target URL:{Colors.RESET} {url}\n")

    report: Dict[str, Any] = {
        "target": url,
        "cors": {},
        "headers": {},
        "auth": {},
    }

    # 1. Headers Audit
    print(f"{Colors.BOLD}🔍 [1/3] Auditing HTTP Security Headers...{Colors.RESET}")
    header_res = audit_headers(url)
    report["headers"] = header_res
    if header_res.get("missing_headers"):
        print(f"  {Colors.YELLOW}⚠️  Missing {len(header_res['missing_headers'])} security headers:{Colors.RESET}")
        for h in header_res["missing_headers"]:
            print(f"     ❌ {Colors.RED}{h['header']}{Colors.RESET} ({h['severity']}) - {h['description']}")
    else:
        print(f"  {Colors.GREEN}✅ All critical security headers present!{Colors.RESET}")

    # 2. CORS Audit
    print(f"\n{Colors.BOLD}🌐 [2/5] Auditing CORS Configuration...{Colors.RESET}")
    cors_res = audit_cors(url)
    report["cors"] = cors_res
    if cors_res.get("findings"):
        print(f"  {Colors.RED}🚨 Found {len(cors_res['findings'])} CORS vulnerabilities:{Colors.RESET}")
        for f in cors_res["findings"]:
            print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")
    else:
        print(f"  {Colors.GREEN}✅ No obvious CORS reflection vulnerabilities detected.{Colors.RESET}")

    # 3. Cookie & CSRF Audit
    from tools.cookie_auditor import audit_cookies
    print(f"\n{Colors.BOLD}🍪 [3/5] Auditing Cookie Security & CSRF Protections...{Colors.RESET}")
    cookie_res = audit_cookies(url)
    report["cookies"] = cookie_res
    if cookie_res.get("findings"):
        print(f"  {Colors.YELLOW}⚠️  Found {len(cookie_res['findings'])} cookie security issues:{Colors.RESET}")
        for f in cookie_res["findings"]:
            print(f"     ❌ {Colors.YELLOW}{f['title']}{Colors.RESET}: {f['message']}")
    else:
        print(f"  {Colors.GREEN}✅ Cookies enforce secure flags (HttpOnly, Secure, SameSite).{Colors.RESET}")

    # 4. Open Redirect Audit
    from tools.redirect_scanner import audit_open_redirect
    print(f"\n{Colors.BOLD}🔀 [4/5] Probing for Open Redirect Vulnerabilities...{Colors.RESET}")
    redir_res = audit_open_redirect(url)
    report["redirects"] = redir_res
    if redir_res.get("findings"):
        print(f"  {Colors.RED}🚨 Found {len(redir_res['findings'])} Open Redirect parameters:{Colors.RESET}")
        for f in redir_res["findings"]:
            print(f"     ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")
    else:
        print(f"  {Colors.GREEN}✅ No open redirect vulnerabilities detected.{Colors.RESET}")

    # 5. Auth Probing
    print(f"\n{Colors.BOLD}🔓 [5/5] Probing Common API Routes for Unauthenticated Access...{Colors.RESET}")
    auth_res = probe_endpoints(url)
    report["auth"] = auth_res
    if auth_res.get("vulnerable_endpoints"):
        print(f"  {Colors.RED}🚨 Detected {len(auth_res['vulnerable_endpoints'])} unauthenticated endpoints:{Colors.RESET}")
        for ep in auth_res["vulnerable_endpoints"]:
            print(f"     ❌ {Colors.RED}{ep['route']}{Colors.RESET} (HTTP {ep['status_code']} OK without auth)")
    else:
        print(f"  {Colors.GREEN}✅ Probed routes properly enforce authentication/404.{Colors.RESET}")

    print(f"\n{Colors.BLUE}{Colors.BOLD}========================================================{Colors.RESET}")
    print(f"{Colors.GREEN}Audit Complete!{Colors.RESET}\n")

    if output_json:
        print(json.dumps(report, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="Sentinel Python Security & Pentest Toolkit",
        formatter_class=argparse.RawTextHelpFormatter
    )

    subparsers = parser.add_subparsers(dest="command", help="Available security tools")

    # Command: audit (Full web audit)
    audit_parser = subparsers.add_parser("audit", help="Run comprehensive audit (Headers + CORS + Auth)")
    audit_parser.add_argument("url", help="Target URL (e.g. https://example.com)")
    audit_parser.add_argument("--json", action="store_true", help="Output results as JSON")

    # Command: cors
    cors_parser = subparsers.add_parser("cors", help="Audit CORS misconfigurations")
    cors_parser.add_argument("url", help="Target URL to test")

    # Command: headers
    headers_parser = subparsers.add_parser("headers", help="Audit HTTP security headers")
    headers_parser.add_argument("url", help="Target URL to test")

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
    elif args.command == "cookies":
        from tools.cookie_auditor import audit_cookies
        res = audit_cookies(args.url)
        print(json.dumps(res, indent=2))
    elif args.command == "redirect":
        from tools.redirect_scanner import audit_open_redirect
        res = audit_open_redirect(args.url)
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
        from tools.api_finder import find_api_endpoints
        print_banner()
        print(f"{Colors.CYAN}Discovering API Endpoints for:{Colors.RESET} {args.url}...\n")
        res = find_api_endpoints(args.url)
        if args.json:
            print(json.dumps(res, indent=2))
        else:
            print(f"📊 {Colors.BOLD}Discovered {res['total_endpoints_found']} API Endpoints:{Colors.RESET}")
            for ep in res["endpoints"]:
                print(f"  ⚡ {Colors.GREEN}{ep}{Colors.RESET}")
            if res.get("specs_discovered"):
                print(f"\n📑 {Colors.BOLD}Discovered API Documentation & Specs:{Colors.RESET}")
                for s in res["specs_discovered"]:
                    print(f"  👉 {Colors.YELLOW}{s['type']}{Colors.RESET}: {s['url']}")
            print(f"\n{Colors.BLUE}========================================================{Colors.RESET}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
