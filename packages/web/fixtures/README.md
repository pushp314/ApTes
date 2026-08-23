# Web fixtures

These static fixtures provide distinct baseline targets for rule validation:

- `healthy-site` — expected no client-side defect findings.
- `broken-links-site` — a deliberately missing internal link.
- `console-error-site` — a deliberate console error.
- `broken-images-site` — a deliberately missing image.
- `invalid-form-site` — a form missing action, names, and a submit control.
- `ai-widget-site` — a known chat-vendor script plus an explicit, auditable
  MCP target declaration for correlation tests.

Serve the fixtures from a local test server only with the explicit
`allowLocal`/`--allow-local` testing opt-in and a valid authorization record.
