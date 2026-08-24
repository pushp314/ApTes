---
title: Interactive Playground
---

<script setup>
import Playground from '../components/Playground.vue'
</script>

# Interactive Demo

Experience the Sentinel CLI directly in your browser. This simulation demonstrates the exact output, engine initialization, and correlation logic you'll see when running Sentinel against a real target.

<Playground />

## What's Happening Here?

1. **Authorization Check:** Sentinel explicitly verifies the target URL against the authorization flags (`-y` or interactive prompt) before dispatching any engines.
2. **Concurrent Engines:** Notice how the `WebSentinel` and `CodeSentinel` engines initialize concurrently to save time.
3. **Correlation:** The final stage isn't just dumping a list of CVEs. Sentinel's Correlation Engine synthesizes the findings to output a high-confidence attack path.

> [!TIP]
> Ready to run it for real? Head over to the [Installation](./installation.md) guide or explore the [CLI Reference](../cli-reference/interactive-wizard.md).
