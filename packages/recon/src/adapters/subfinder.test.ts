import { describe, it, expect } from "vitest";
import { SubfinderAdapter } from "./subfinder.js";

describe("SubfinderAdapter", () => {
  it("parses JSON lines subdomain discovery output correctly", () => {
    const stdout = `
{"host":"api.example.com","ip":"93.184.216.34","sources":["crtsh","alienvault"]}
{"host":"admin.example.com","ip":"93.184.216.35","sources":["shodan"]}
{"host":"staging.example.com","sources":["hackertarget"]}
    `.trim();

    const findings = SubfinderAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 3000,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(3);

    expect(findings[0].ruleId).toBe("recon-subdomain-discovered");
    expect(findings[0].category).toBe("attack-surface");
    expect(findings[0].severity).toBe("info");
    expect(findings[0].title).toBe("Discovered Subdomain: api.example.com");
    expect((findings[0].evidence as any).host).toBe("api.example.com");
    expect((findings[0].evidence as any).sources).toEqual([
      "crtsh",
      "alienvault",
    ]);

    expect(findings[1].title).toBe("Discovered Subdomain: admin.example.com");
  });

  it("handles empty or clean output", () => {
    const findings = SubfinderAdapter.parse(
      {
        stdout: "",
        stderr: "",
        exitCode: 0,
        durationMs: 500,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(0);
  });
});
