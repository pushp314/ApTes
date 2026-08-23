# Your First Scan

This guide walks you through running your very first Sentinel scan against the included vulnerable test project.

## Step 1: Build the Project

```bash
cd ApTes
npm install
npm run build
npm link ./packages/platform
```

## Step 2: Run Against the Test Fixtures

Sentinel includes a `sample-project` with intentionally vulnerable code. Let's scan it:

```bash
sentinel scan http://localhost:3000 \
  -m "node fake.js" \
  -y \
  -c packages/codesentinel/fixtures/sample-project \
  --allow-local
```

## Step 3: Read the Output

You'll see colorized output like this:

```
========================================
    SENTINEL UNIFIED REPORT
========================================
Project: sentinel-1724451234567
Score:   0/100
Time:    2150ms
========================================

  [CRITICAL] Hardcoded Secret
             Variable 'API_KEY' contains a hardcoded secret.
             Rule: hardcoded-secret | Location: src/app.ts:3:1
             Fix: Move secrets to environment variables.

  [HIGH    ] Missing Authentication on Sensitive Route
             Route '/admin/delete' appears sensitive but lacks middleware.
             Rule: missing-auth | Location: src/vulnerable/router-auth.js:5:1
             Fix: Apply authentication middleware to this route.

  [HIGH    ] Request/Response Payload Mismatch
             Frontend sends to '/api/update-profile' but is missing fields: [email, age].
             Rule: payload-mismatch | Location: src/vulnerable/payload-mismatch.ts:16:9
             Fix: Update the frontend payload or make backend fields optional.

  [HIGH    ] Illogical Condition
             Always-true condition detected in if statement.
             Rule: logic-contradictions | Location: src/vulnerable/vulnerable.ts:16:7
             Fix: Refactor the logic or remove dead code.

========================================
Found 113 total issue(s).
```

## Step 4: Understanding the Results

Each finding contains:
- **Severity** — `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`
- **Title** — What was found
- **Message** — Detailed explanation
- **Rule** — Which detection rule flagged it
- **Location** — Exact file and line number
- **Fix** — Actionable remediation guidance

## Step 5: Enable AI for Deeper Analysis

If you have Ollama running locally with `llama3`:

```bash
sentinel scan http://localhost:3000 \
  -m "node fake.js" \
  -y \
  -c packages/codesentinel/fixtures/sample-project \
  --allow-local \
  -A
```

The AI Reviewer will analyze ambiguous findings and append:
- **Verdict** (confirmed / dismissed)
- **Confidence score** (0.0 to 1.0)
- **1-Click Patch** (unified git diff)
- **Exploit PoC** (curl command to reproduce)

## Next Steps

- [📐 Understand the Architecture](/architecture/system-overview)
- [🔬 Explore CodeSentinel's 15+ Rules](/engines/codesentinel)
- [⚙️ CLI Reference & Examples](/cli-reference/overview)
