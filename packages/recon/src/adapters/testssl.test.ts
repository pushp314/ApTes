import { describe, it, expect } from "vitest";
import { TestsslAdapter } from "./testssl.js";

describe("TestsslAdapter", () => {
  it("parses testssl.sh JSON output with vulnerabilities and warnings", () => {
    const stdout = `
Banner text before JSON...
[
  {
    "id": "cert_expirationStatus",
    "ip": "192.168.1.50/443",
    "finding": "certificate has expired",
    "severity": "HIGH"
  },
  {
    "id": "SSLv2",
    "ip": "192.168.1.50/443",
    "finding": "offered (NOT ok)",
    "severity": "CRITICAL"
  },
  {
    "id": "TLS1",
    "ip": "192.168.1.50/443",
    "finding": "offered (deprecated)",
    "severity": "MEDIUM"
  },
  {
    "id": "HSTS_time",
    "ip": "192.168.1.50/443",
    "finding": "not offered",
    "severity": "WARN"
  },
  {
    "id": "TLS1_3",
    "ip": "192.168.1.50/443",
    "finding": "offered",
    "severity": "OK"
  }
]
    `.trim();

    const findings = TestsslAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 4500,
      },
      "proj-1",
      "run-1",
    );

    // Should filter out the "OK" item and produce 4 findings
    expect(findings.length).toBe(4);

    const expiredCert = findings.find(
      (f) => f.ruleId === "recon-testssl-cert_expirationStatus",
    );
    expect(expiredCert).toBeDefined();
    expect(expiredCert!.severity).toBe("high");
    expect(expiredCert!.title).toContain("Certificate Expired");

    const ssl2 = findings.find((f) => f.ruleId === "recon-testssl-SSLv2");
    expect(ssl2).toBeDefined();
    expect(ssl2!.severity).toBe("critical");

    const tls1 = findings.find((f) => f.ruleId === "recon-testssl-TLS1");
    expect(tls1).toBeDefined();
    expect(tls1!.severity).toBe("medium");

    const hsts = findings.find((f) => f.ruleId === "recon-testssl-HSTS_time");
    expect(hsts).toBeDefined();
    expect(hsts!.severity).toBe("medium");
    expect(hsts!.title).toContain("HSTS");
  });

  it("handles safe configuration with zero findings", () => {
    const stdout = `
[
  {
    "id": "cert_expirationStatus",
    "ip": "93.184.216.34/443",
    "finding": "certificate valid for 90 days",
    "severity": "OK"
  },
  {
    "id": "TLS1_3",
    "ip": "93.184.216.34/443",
    "finding": "offered",
    "severity": "OK"
  }
]
    `.trim();

    const findings = TestsslAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 2000,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(0);
  });
});
