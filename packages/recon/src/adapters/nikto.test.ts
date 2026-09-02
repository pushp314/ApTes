import { describe, it, expect } from "vitest";
import { NiktoAdapter } from "./nikto.js";

describe("NiktoAdapter", () => {
  it("parses Nikto JSON vulnerabilities report correctly", () => {
    const stdout = JSON.stringify({
      host: "example.com",
      ip: "93.184.216.34",
      port: "80",
      banner: "Apache/2.4.41",
      vulnerabilities: [
        {
          id: "000001",
          OSVDB: "0",
          method: "GET",
          url: "/robots.txt",
          msg: "robots.txt contains 2 entries which should be manually viewed.",
        },
        {
          id: "000002",
          OSVDB: "3092",
          method: "GET",
          url: "/admin/",
          msg: "Directory indexing found or administrative directory exposed.",
        },
        {
          id: "000003",
          OSVDB: "0",
          method: "GET",
          url: "/",
          msg: "The anti-clickjacking X-Frame-Options header is not present.",
        },
      ],
    });

    const findings = NiktoAdapter.parse(
      {
        stdout,
        stderr: "",
        exitCode: 0,
        durationMs: 8000,
      },
      "proj-1",
      "run-1",
    );

    expect(findings.length).toBe(3);

    // 1. Robots.txt info/low
    const robots = findings.find((f) => f.ruleId === "recon-nikto-000001");
    expect(robots).toBeDefined();
    expect(robots!.severity).toBe("low");

    // 2. Admin exposed path
    const admin = findings.find((f) => f.ruleId === "recon-nikto-000002");
    expect(admin).toBeDefined();
    expect(admin!.severity).toBe("high");
    expect(admin!.category).toBe("sensitive-exposure");
    expect(admin!.title).toContain("Exposed Sensitive Path");

    // 3. Missing header
    const header = findings.find((f) => f.ruleId === "recon-nikto-000003");
    expect(header).toBeDefined();
    expect(header!.severity).toBe("medium");
    expect(header!.category).toBe("config");
    expect(header!.title).toContain("Missing Security Header");
  });

  it("handles clean server scan with no vulnerabilities", () => {
    const stdout = JSON.stringify({
      host: "example.com",
      vulnerabilities: [],
    });

    const findings = NiktoAdapter.parse(
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
