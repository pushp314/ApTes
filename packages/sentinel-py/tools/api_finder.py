"""
API Endpoint Discovery & Reconnaissance Tool
Extracts API endpoints from HTML, JavaScript bundles, sitemaps, and common OpenAPI/Swagger paths.
"""

import re
import urllib.request
import urllib.error
import urllib.parse
import ssl
from typing import Dict, Any, Set, List


COMMON_API_SPECS = [
    "/openapi.json",
    "/swagger.json",
    "/api-docs",
    "/v1/api-docs",
    "/v2/api-docs",
    "/api/swagger.json",
    "/api/openapi.json",
    "/docs",
    "/api/docs",
    "/robots.txt",
    "/sitemap.xml",
]

# Regex patterns to detect API endpoints in JavaScript/HTML content
API_PATTERNS = [
    # Explicit /api/... or /v1/... paths
    r'["\'](/(?:api|v[0-9]+|graphql|auth|admin|users|billing|dashboard|v[0-9]+\.[0-9]+)[/\w\-\.\{\}:]*)["\']',
    # fetch('/path' or axios.get('/path'
    r'(?:fetch|axios|get|post|put|delete|patch)\s*\(\s*["\']([/\w\-\.\{\}:]+)["\']',
    # URLs ending in .json or .action or common REST structures
    r'["\'](https?://[^\s"\'<>]+/api[/\w\-\.\{\}:]*)["\']',
]


def find_api_endpoints(target_url: str, timeout: int = 10, max_js_files: int = 15) -> Dict[str, Any]:
    """
    Crawls the target URL, inspects embedded JavaScript bundles, checks Swagger/OpenAPI endpoints,
    and extracts all discovered API routes.
    """
    clean_base = target_url.rstrip("/")
    parsed_base = urllib.parse.urlparse(target_url)
    base_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    discovered_endpoints: Set[str] = set()
    found_specs: List[Dict[str, Any]] = []
    analyzed_scripts: List[str] = []

    def fetch_url(url: str) -> str:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Sentinel-API-Discovery-Recon/1.0", "Accept": "*/*"},
            )
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception:
            return ""

    # 1. Fetch Root Page HTML
    html_content = fetch_url(target_url)

    # 2. Extract internal script tags (<script src="...">)
    script_srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
    
    # 3. Extract endpoints directly from root HTML
    for pattern in API_PATTERNS:
        for match in re.findall(pattern, html_content):
            if isinstance(match, str) and match.startswith("/"):
                discovered_endpoints.add(match)
            elif isinstance(match, str) and match.startswith("http"):
                discovered_endpoints.add(match)

    # 4. Fetch and scan JavaScript files
    js_urls = []
    for src in script_srcs:
        full_js_url = urllib.parse.urljoin(target_url, src)
        if base_origin in full_js_url or not full_js_url.startswith("http"):
            js_urls.append(full_js_url)

    for js_url in js_urls[:max_js_files]:
        analyzed_scripts.append(js_url)
        js_code = fetch_url(js_url)
        if not js_code:
            continue

        for pattern in API_PATTERNS:
            for match in re.findall(pattern, js_code):
                # Filter out obvious false positives (extensions like .png, .css, .js)
                if any(match.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".svg", ".ico", ".woff"]):
                    continue
                if match.startswith("/") and len(match) > 1:
                    discovered_endpoints.add(match)
                elif match.startswith("http"):
                    discovered_endpoints.add(match)

    # 5. Probe common API documentation and specs (Swagger, OpenAPI, robots.txt)
    for spec_path in COMMON_API_SPECS:
        spec_url = urllib.parse.urljoin(target_url, spec_path)
        spec_content = fetch_url(spec_url)
        if spec_content and len(spec_content) > 10:
            if "openapi" in spec_content.lower() or "swagger" in spec_content.lower() or "paths" in spec_content:
                found_specs.append({"path": spec_path, "url": spec_url, "type": "OpenAPI/Swagger"})
                # Extract paths from JSON if possible
                try:
                    import json
                    data = json.loads(spec_content)
                    if isinstance(data, dict) and "paths" in data:
                        for api_path in data["paths"].keys():
                            discovered_endpoints.add(api_path)
                except Exception:
                    pass
            elif spec_path == "/robots.txt":
                disallows = re.findall(r'Disallow:\s*([^\s]+)', spec_content)
                for d in disallows:
                    if d.startswith("/"):
                        discovered_endpoints.add(d)
                found_specs.append({"path": spec_path, "url": spec_url, "type": "Robots.txt"})

    # Sort endpoints alphabetically
    sorted_endpoints = sorted(list(discovered_endpoints))

    return {
        "target": target_url,
        "total_endpoints_found": len(sorted_endpoints),
        "endpoints": sorted_endpoints,
        "specs_discovered": found_specs,
        "scripts_analyzed": analyzed_scripts,
    }
