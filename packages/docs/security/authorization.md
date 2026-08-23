# Authorization

Sentinel operates on the principle of Explicit Consent.

## The Authorization Gate
The CLI flag `--authorized` (or `--i-own-this-target` for standalone engines) is structurally required by the orchestrator configuration schema.

If a CI/CD pipeline or user attempts to execute `sentinel scan` without passing this flag, the orchestrator terminates with a non-zero exit code before any engine is instantiated.

This acts as a legally and operationally binding consent mechanism.
