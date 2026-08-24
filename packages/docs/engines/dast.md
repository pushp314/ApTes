# Active DAST Engine (Python)

Sentinel uses a powerful multi-threaded Python engine (`packages/sentinel-py`) to perform active Dynamic Application Security Testing (DAST) on live targets.

## Multi-Threaded Execution

The engine utilizes Python's `concurrent.futures.ThreadPoolExecutor` to execute hundreds of network requests simultaneously, drastically reducing audit time. The execution pipeline is hooked into the real-time CLI terminal stream to provide live feedback.

## Scanners & Modules

### 1. Admin Panel & Secret Route Probing
The `admin_scanner.py` module contains a predefined dictionary of over 130 common, sensitive, and hidden administration routes (e.g., `/admin`, `/wp-admin`, `/api/v1/users`, `/swagger-ui.html`). 

**Features:**
- **Parallel Probing:** Fires concurrent GET requests to discover exposed administrative interfaces without brute-forcing passwords.
- **Status Analysis:** Analyzes HTTP status codes (200 OK vs 401 Unauthorized vs 403 Forbidden).
- **Vulnerability Reporting:** If an administrative panel or API endpoint returns a `200 OK` (meaning it is accessible without authentication), it immediately creates a High/Critical severity finding in the final Unified Report.

### 2. Open Redirect Scanner
The `redirect_scanner.py` module dynamically fuzzes query parameters commonly associated with open redirects (`?url=`, `?next=`, `?redirect=`) using common bypass payloads (e.g., `https://evil.com`, `//evil.com`). It ensures that user-supplied input cannot silently bounce victims to malicious domains.
