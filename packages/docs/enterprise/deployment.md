# Deployment & Air-gapped Environments

Sentinel Enterprise is designed to be deployed wherever your code lives. Because Sentinel relies on deterministic AST parsing and local Playwright execution, it **does not require internet access** to function, making it ideal for highly sensitive or classified environments.

## Kubernetes (Helm)

The primary deployment method for Sentinel Enterprise is via our official Helm chart.

```bash
helm repo add sentinel https://charts.sentinel-security.dev
helm install my-sentinel sentinel/sentinel-enterprise -f values.yaml
```

Our Helm chart includes:
- High-availability (HA) configuration out-of-the-box.
- Built-in Redis for distributed task queues (handling thousands of concurrent scans).
- PostgreSQL for centralized finding storage.

## Air-Gapped Deployment

For air-gapped environments (e.g., defense, finance), Sentinel provides offline bundles.

1. Download the offline tarball from the Enterprise Portal.
2. Transfer the tarball across the air-gap via secure media.
3. Load the container images into your private registry.
4. Deploy using the local Helm chart.

Sentinel's LLM features (Ollama) can also be packaged and run entirely offline, ensuring no code or prompts ever leave your internal network.

## On-Premise Agents

If your codebase is too large to move, or sits behind a strict firewall, you can deploy **Sentinel Agents** locally on your CI/CD runners (Jenkins, GitLab CI, GitHub Actions runners). These agents perform the heavy AST and DOM scanning locally and only stream the resulting `Finding` metadata back to the centralized Enterprise Dashboard.
