# ReconSentinel

ReconSentinel is the active network reconnaissance engine of the Sentinel platform. It wrappers powerful, industry-standard active security tools (like Nmap and Nuclei) and translates their chaotic output into a structured, deterministic `Finding[]` stream that the orchestrator can correlate.

## Why Recon?

Static analysis (SAST) and dynamic web scanning (DAST) have blind spots when it comes to the raw network layer. CodeSentinel might see that a route has no authentication, but it doesn't know if that service is actually exposed to the public internet. WebSentinel might crawl a web page, but it won't see an exposed Redis database sitting on a non-standard port.

ReconSentinel bridges this gap by proving **reachability**. 

## Supported Adapters

ReconSentinel currently ships with two primary adapters:

### Nmap Adapter
- Uses the `nmap` CLI to discover open ports, services, and OS fingerprints.
- Emits findings like `open-port` or `exposed-service`.
- **Determinism Strategy:** Uses strict XML parsing (`nmap -oX`) to guarantee structural consistency in results, avoiding the brittleness of standard terminal output parsing.

### Nuclei Adapter
- Uses ProjectDiscovery's `nuclei` template-based scanner.
- Emits high-confidence findings based on known CVE templates and misconfigurations.
- **Determinism Strategy:** Consumes JSON output (`-json-export`) and maps Nuclei severity scales directly into the Sentinel `Severity` enum.

## Architecture

ReconSentinel acts as a Tool Integration Layer. It does not reinvent network scanning; instead, it provides a stable bridge between noisy open-source tools and Sentinel's strict correlation orchestrator.

```typescript
// The ToolAdapter interface
export interface ToolAdapter {
  name: string;
  run(target: string): Promise<Finding[]>;
}
```

By adhering to this adapter pattern, adding new tools (like Hydra, SpiderFoot, or Amass) is trivial. The orchestrator doesn't need to know how Nmap works—it only needs to know that ReconSentinel has produced a `Finding`.

## Determinism & Testing

Active scanning is inherently non-deterministic (network latency, dropped packets, shifting IPs). To ensure the Sentinel engine remains completely testable, all Recon adapters are heavily tested using **Fixture Testing**. 

Instead of running live Nmap scans during CI/CD, the tests inject real Nmap XML output files (fixtures) and assert that the parsing and mapping logic behaves perfectly. This guarantees that Sentinel's correlation math will never fail due to an adapter update.
