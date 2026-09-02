import { describe, it, expect } from "vitest";
import { TheHarvesterAdapter } from "./theharvester.js";

describe("TheHarvesterAdapter", () => {
  it("parses harvested emails and hosts from JSON output", () => {
    const stdout = JSON.stringify({
      emails: [
        "alice@corp.example.com",
        "bob.sec@corp.example.com",
        "alice@corp.example.com",
      ],
      hosts: ["vpn.example.com:1.2.3.4", "mail.example.com:1.2.3.5"],
      asns: ["AS12345"],
    });

    const findings = TheHarvesterAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 5000,
      },
      "proj-1",
      "run-1",
    );

    // 1 deduplicated email finding + 2 host findings = 3 findings
    expect(findings.length).toBe(3);

    const emailFinding = findings.find(
      (f) => f.ruleId === "recon-osint-email-leak",
    );
    expect(emailFinding).toBeDefined();
    expect(emailFinding!.severity).toBe("low");
    expect(emailFinding!.category).toBe("osint-leakage");
    expect((emailFinding!.evidence as any).totalCount).toBe(2);
    expect((emailFinding!.evidence as any).emails).toEqual([
      "alice@corp.example.com",
      "bob.sec@corp.example.com",
    ]);

    const vpnHost = findings.find((f) => f.title.includes("vpn.example.com"));
    expect(vpnHost).toBeDefined();
    expect(vpnHost!.severity).toBe("info");
    expect((vpnHost!.evidence as any).ip).toBe("1.2.3.4");
  });

  it("handles empty results cleanly", () => {
    const findings = TheHarvesterAdapter.parse(
      {
        stdout: JSON.stringify({ emails: [], hosts: [] }),
        stderr: "",
        exitCode: 0,
        durationMs: 1000,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(0);
  });
});
