"""
Sentinel Interactive Mission Control Dashboard (Terminal UI)
Unified launcher for all Sentinel security engines, tools, and documentation.
"""

import sys
import os
import subprocess
import json


class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def print_banner():
    print(f"{Colors.BLUE}{Colors.BOLD}")
    print("  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     ")
    print("  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     ")
    print("  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     ")
    print("  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     ")
    print("  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗")
    print("  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝")
    print(f"      {Colors.CYAN}🛡️  UNIFIED SECURITY & AUDITING MISSION CONTROL HUB{Colors.RESET}\n")


def prompt_url(default="https://example.com"):
    print(f"\n{Colors.YELLOW}Enter target URL (default: {default}):{Colors.RESET} ", end="")
    url = input().strip()
    return url if url else default


def run_interactive_dashboard():
    while True:
        clear_screen()
        print_banner()
        print(f"{Colors.BOLD}Select an action from the Mission Control Index:{Colors.RESET}\n")
        print(f"  {Colors.GREEN}[1]{Colors.RESET} 🔍  {Colors.BOLD}Discover API Endpoints & Attack Surface{Colors.RESET}  (HTML + JS Bundles + Swagger)")
        print(f"  {Colors.GREEN}[2]{Colors.RESET} 🛡️  {Colors.BOLD}Run Full Web Vulnerability Audit{Colors.RESET}        (Headers + CORS + Cookies + Redirects + Auth)")
        print(f"  {Colors.GREEN}[3]{Colors.RESET} 🔀  {Colors.BOLD}Test for Open Redirect Vulnerabilities{Colors.RESET}  (15+ query parameter probes)")
        print(f"  {Colors.GREEN}[4]{Colors.RESET} 🍪  {Colors.BOLD}Audit Cookie Security & CSRF Flags{Colors.RESET}      (HttpOnly + Secure + SameSite)")
        print(f"  {Colors.GREEN}[5]{Colors.RESET} 🌐  {Colors.BOLD}Audit CORS Misconfigurations{Colors.RESET}            (Dynamic origin reflection & credentials)")
        print(f"  {Colors.GREEN}[6]{Colors.RESET} 🔑  {Colors.BOLD}Audit & Forensically Inspect a JWT{Colors.RESET}      (Algorithm none + exp checks)")
        print(f"  {Colors.GREEN}[7]{Colors.RESET} 🔓  {Colors.BOLD}Probe API Endpoints for Auth Bypass{Colors.RESET}     (401/403 vs 200 checks)")
        print(f"  {Colors.GREEN}[8]{Colors.RESET} 💻  {Colors.BOLD}Run CodeSentinel AST Source Code Scan{Colors.RESET}   (TypeScript / JavaScript / Python AST)")
        print(f"  {Colors.GREEN}[9]{Colors.RESET} 📖  {Colors.BOLD}Open Documentation Website{Colors.RESET}              (Live VitePress docs server)")
        print(f"  {Colors.RED}[0]{Colors.RESET} 🚪  Exit\n")

        print(f"{Colors.CYAN}Enter selection [0-9]:{Colors.RESET} ", end="")
        choice = input().strip()

        if choice == "0":
            print(f"\n{Colors.GREEN}Exiting Sentinel Mission Control. Stay secure!{Colors.RESET}\n")
            break

        elif choice == "1":
            from tools.api_finder import find_api_endpoints
            url = prompt_url()
            print(f"\n{Colors.CYAN}Crawling and discovering API endpoints on {url}...{Colors.RESET}\n")
            res = find_api_endpoints(url)
            print(f"📊 {Colors.BOLD}Discovered {res['total_endpoints_found']} API Endpoints:{Colors.RESET}")
            for ep in res["endpoints"]:
                print(f"  ⚡ {Colors.GREEN}{ep}{Colors.RESET}")
            if res.get("specs_discovered"):
                print(f"\n📑 {Colors.BOLD}API Documentation & Specs Discovered:{Colors.RESET}")
                for s in res["specs_discovered"]:
                    print(f"  👉 {Colors.YELLOW}{s['type']}{Colors.RESET}: {s['url']}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "2":
            from sentinel import run_full_audit
            url = prompt_url()
            run_full_audit(url)
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "3":
            from tools.redirect_scanner import audit_open_redirect
            url = prompt_url("https://example.com/login")
            print(f"\n{Colors.CYAN}Probing {url} for Open Redirect flaws...{Colors.RESET}\n")
            res = audit_open_redirect(url)
            if res.get("findings"):
                print(f"🚨 {Colors.RED}VULNERABLE! Found {len(res['findings'])} Open Redirect parameters:{Colors.RESET}")
                for f in res["findings"]:
                    print(f"   ❌ Parameter: {Colors.RED}{f['param']}{Colors.RESET} -> Location: {f['location_header']}")
            else:
                print(f"✅ {Colors.GREEN}No unvalidated Open Redirects found on common parameters.{Colors.RESET}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "4":
            from tools.cookie_auditor import audit_cookies
            url = prompt_url()
            print(f"\n{Colors.CYAN}Auditing cookies for {url}...{Colors.RESET}\n")
            res = audit_cookies(url)
            print(f"📊 {Colors.BOLD}Total Cookies Found:{Colors.RESET} {res.get('total_cookies', 0)}")
            if res.get("findings"):
                print(f"⚠️  {Colors.YELLOW}Cookie Security Findings:{Colors.RESET}")
                for f in res["findings"]:
                    print(f"   ❌ {Colors.YELLOW}{f['title']}{Colors.RESET}: {f['message']}")
            else:
                print(f"✅ {Colors.GREEN}All cookies enforce HttpOnly, Secure, and SameSite!{Colors.RESET}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "5":
            from tools.cors_scanner import audit_cors
            url = prompt_url()
            print(f"\n{Colors.CYAN}Auditing CORS configuration for {url}...{Colors.RESET}\n")
            res = audit_cors(url)
            if res.get("findings"):
                print(f"🚨 {Colors.RED}CORS Misconfigurations Detected:{Colors.RESET}")
                for f in res["findings"]:
                    print(f"   ❌ {Colors.RED}{f['title']}{Colors.RESET}: {f['message']}")
            else:
                print(f"✅ {Colors.GREEN}No CORS reflection vulnerabilities detected.{Colors.RESET}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "6":
            from tools.jwt_analyzer import analyze_jwt
            print(f"\n{Colors.YELLOW}Paste JWT token string:{Colors.RESET} ", end="")
            token = input().strip()
            if token:
                res = analyze_jwt(token)
                print(f"\n{Colors.BOLD}Algorithm:{Colors.RESET} {res.get('algorithm')}")
                print(f"{Colors.BOLD}Expired:{Colors.RESET} {'🚨 YES' if res.get('is_expired') else '✅ NO'}")
                print(f"{Colors.BOLD}Payload:{Colors.RESET} {json.dumps(res.get('payload'), indent=2)}")
                if res.get("warnings"):
                    print(f"\n{Colors.RED}Security Warnings:{Colors.RESET}")
                    for w in res["warnings"]:
                        print(f"   ⚠️  {Colors.RED}{w['title']}{Colors.RESET}: {w['message']}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "7":
            from tools.auth_prober import probe_endpoints
            url = prompt_url()
            print(f"{Colors.YELLOW}Enter comma-separated routes to probe (or press Enter for default common routes):{Colors.RESET} ", end="")
            routes_in = input().strip()
            routes = [r.strip() for r in routes_in.split(",")] if routes_in else None
            print(f"\n{Colors.CYAN}Probing routes on {url}...{Colors.RESET}\n")
            res = probe_endpoints(url, routes=routes)
            if res.get("vulnerable_endpoints"):
                print(f"🚨 {Colors.RED}Unauthenticated Endpoints Found:{Colors.RESET}")
                for ep in res["vulnerable_endpoints"]:
                    print(f"   ❌ {Colors.RED}{ep['route']}{Colors.RESET} (HTTP {ep['status_code']} OK without auth)")
            else:
                print(f"✅ {Colors.GREEN}All tested routes require authentication.{Colors.RESET}")
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "8":
            print(f"\n{Colors.CYAN}Running CodeSentinel AST source code audit...{Colors.RESET}\n")
            subprocess.run(["npm", "run", "test", "--workspace=@sentinel/codesentinel"])
            input(f"\n{Colors.YELLOW}Press Enter to return to Dashboard...{Colors.RESET}")

        elif choice == "9":
            print(f"\n{Colors.CYAN}Launching VitePress Documentation Web Server at http://localhost:5173...{Colors.RESET}\n")
            try:
                subprocess.run(["npx", "vitepress", "dev", "packages/docs"])
            except KeyboardInterrupt:
                pass
