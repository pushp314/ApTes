"""
Unit tests for Sentinel Python Security Toolkit
"""

import unittest
import http.server
import threading
import json
import os
import sys

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tools.jwt_analyzer import analyze_jwt
from tools.cors_scanner import audit_cors
from tools.headers_scanner import audit_headers
from tools.auth_prober import probe_endpoints
from tools.api_finder import find_api_endpoints
from tools.redirect_scanner import audit_open_redirect
from tools.cookie_auditor import audit_cookies
from tools.csp_analyzer import audit_csp, parse_csp
from tools.tech_fingerprinter import fingerprint_target
from tools.subdomain_scanner import scan_subdomains
from tools.port_scanner import scan_ports


class MockSecurityHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        # Simulate vulnerable CORS reflecting origin
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()

    def do_HEAD(self):
        # Simulate server with missing security headers
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()

    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Set-Cookie", "session=insecure_token; Path=/")
            self.send_header("Server", "Apache/2.4.41 (Ubuntu)")
            self.send_header("X-Powered-By", "Express")
            self.send_header("Content-Security-Policy", "script-src 'self' 'unsafe-inline' *; object-src 'none'")
            self.end_headers()
            self.wfile.write(b'<html><script src="/static/bundle.js"></script><a href="/api/v1/users">Users</a><div data-reactroot=""></div></html>')
        elif self.path.startswith("/login"):
            # Simulate vulnerable open redirect
            self.send_response(302)
            self.send_header("Location", "https://evil-attacker.com")
            self.end_headers()
        elif self.path == "/static/bundle.js":
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript")
            self.end_headers()
            self.wfile.write(b'fetch("/api/v1/auth/login"); axios.get("/api/v1/billing/invoices");')
        elif self.path == "/robots.txt":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"User-agent: *\nDisallow: /api/internal/debug\n")
        elif self.path == "/api/admin/unprotected":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"secret_admin_data": "exposed"}).encode("utf-8"))
        elif self.path == "/api/admin/protected":
            self.send_response(401)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Silence HTTP server logs during tests
        pass


class TestSentinelTools(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.HTTPServer(("127.0.0.1", 0), MockSecurityHandler)
        cls.port = cls.server.server_port
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_jwt_analyzer_algorithm_none(self):
        # Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
        # Payload: {"user":"admin","admin":true} -> eyJ1c2VyIjoiYWRtaW4iLCJhZG1pbiI6dHJ1ZX0
        token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJhZG1pbiI6dHJ1ZX0."
        res = analyze_jwt(token)

        self.assertTrue(res["vulnerable"])
        self.assertEqual(res["algorithm"], "none")
        self.assertTrue(any("Insecure Algorithm 'none'" in w["title"] for w in res["warnings"]))

    def test_jwt_analyzer_expired_token(self):
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdCIsImV4cCI6MTU3NzgzNjgwMH0.sig"
        res = analyze_jwt(token)

        self.assertTrue(res["is_expired"])
        self.assertTrue(any("Expired Token" in w["title"] for w in res["warnings"]))

    def test_cors_scanner_reflection(self):
        res = audit_cors(self.base_url)
        self.assertTrue(res["vulnerable"])
        self.assertTrue(any("CORS Origin Reflection" in f["title"] for f in res["findings"]))

    def test_headers_scanner_missing_headers(self):
        res = audit_headers(self.base_url)
        self.assertIn("missing_headers", res)
        missing_names = [h["header"] for h in res["missing_headers"]]
        self.assertIn("strict-transport-security", missing_names)

    def test_auth_prober_unauthenticated_endpoint(self):
        res = probe_endpoints(self.base_url, routes=["/api/admin/unprotected", "/api/admin/protected"])
        self.assertEqual(len(res["vulnerable_endpoints"]), 1)
        self.assertEqual(res["vulnerable_endpoints"][0]["route"], "/api/admin/unprotected")
        self.assertEqual(len(res["protected_endpoints"]), 1)

    def test_find_api_endpoints(self):
        res = find_api_endpoints(self.base_url)
        self.assertGreater(res["total_endpoints_found"], 0)
        self.assertIn("/api/v1/auth/login", res["endpoints"])
        self.assertIn("/api/v1/billing/invoices", res["endpoints"])
        self.assertIn("/api/v1/users", res["endpoints"])
        self.assertIn("/api/internal/debug", res["endpoints"])

    def test_redirect_scanner(self):
        login_url = f"{self.base_url}/login"
        res = audit_open_redirect(login_url, params=["redirect"])
        self.assertTrue(res["is_vulnerable"])
        self.assertEqual(len(res["findings"]), 1)
        self.assertEqual(res["findings"][0]["param"], "redirect")

    def test_cookie_auditor(self):
        res = audit_cookies(self.base_url)
        self.assertTrue(res["is_vulnerable"])
        self.assertEqual(res["total_cookies"], 1)
        titles = [f["title"] for f in res["findings"]]
        self.assertTrue(any("Missing 'HttpOnly'" in t for t in titles))
        self.assertTrue(any("Weak/Missing 'SameSite'" in t for t in titles))

    def test_csp_analyzer(self):
        res = audit_csp(self.base_url)
        self.assertTrue(res["has_csp"])
        titles = [f["title"] for f in res["findings"]]
        self.assertTrue(any("unsafe-inline" in t for t in titles))
        self.assertTrue(any("Wildcard" in t for t in titles))

    def test_tech_fingerprinter(self):
        res = fingerprint_target(self.base_url)
        self.assertIn("React", res["detected_technologies"])
        self.assertEqual(res["powered_by"], "Express")
        self.assertTrue(any("Server:" in v for v in res["version_disclosures"]))

    def test_subdomain_scanner_structure(self):
        res = scan_subdomains("localhost")
        self.assertEqual(res["base_domain"], "localhost")
        self.assertIn("discovered", res)

    def test_port_scanner_local(self):
        res = scan_ports(f"127.0.0.1:{self.port}")
        self.assertIn("open_ports", res)


if __name__ == "__main__":
    unittest.main()
