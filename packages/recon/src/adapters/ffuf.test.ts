import { describe, it, expect } from "vitest";
import { FfufAdapter } from "./ffuf.js";

describe("FfufAdapter", () => {
  it("parses FFUF JSON output and categorizes sensitive endpoints", () => {
    const stdout = JSON.stringify({
      commandline: "ffuf -u https://example.com/FUZZ -w words.txt -of json",
      results: [
        {
          input: { FUZZ: "admin" },
          position: 1,
          status: 200,
          length: 1200,
          words: 250,
          lines: 40,
          url: "https://example.com/admin",
        },
        {
          input: { FUZZ: "swagger" },
          position: 2,
          status: 200,
          length: 4500,
          words: 600,
          lines: 100,
          url: "https://example.com/swagger",
        },
        {
          input: { FUZZ: "secret-portal" },
          position: 3,
          status: 403,
          length: 220,
          words: 10,
          lines: 4,
          url: "https://example.com/secret-portal",
        },
      ],
    });

    const findings = FfufAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 3500,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(3);

    // 1. Admin exposed endpoint (High)
    const admin = findings.find((f) => f.ruleId === "recon-ffuf-admin");
    expect(admin).toBeDefined();
    expect(admin!.severity).toBe("high");
    expect(admin!.category).toBe("sensitive-exposure");
    expect(admin!.title).toContain("Exposed Administrative");

    // 2. Swagger docs discovery (Info)
    const swagger = findings.find((f) => f.ruleId === "recon-ffuf-swagger");
    expect(swagger).toBeDefined();
    expect(swagger!.severity).toBe("info");
    expect(swagger!.category).toBe("attack-surface");

    // 3. Protected endpoint (Low)
    const secret = findings.find(
      (f) => f.ruleId === "recon-ffuf-secret-portal",
    );
    expect(secret).toBeDefined();
    expect(secret!.severity).toBe("low");
    expect(secret!.title).toContain("Protected Internal Endpoint");
  });

  it("handles empty results array cleanly", () => {
    const stdout = JSON.stringify({
      results: [],
    });

    const findings = FfufAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 1500,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(0);
  });
});
