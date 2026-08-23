# Reporting

Sentinel supports generating professional, parsable reports.

## Reporters

1. **CLI Reporter (`CliReporter`)**: Formats findings to `stdout` with color coding, separating them by engine for easy debugging.
2. **JSON Reporter (`JsonReporter`)**: Outputs a raw `.json` file containing the strict `Finding[]` array, ideal for CI/CD ingestion.
3. **HTML Reporter (`HtmlReporter`)**: Generates an interactive web report summarizing the scan.
4. **Markdown Reporter (`MarkdownReporter`)**: Generates a standard `.md` audit.

## Output Structure

The deterministic fields (`severity`, `ruleId`, `message`) are the core of the report. If the AI Assist module was enabled and evaluated a finding, the `aiAssessment` field will be appended, including the `confidenceScore`, an `explanation`, and importantly, a `.patch` string for auto-remediation.
