[**sentinel**](../../../README.md)

***

# Interface: WebContext

Web engine evaluation context.
The web-worker package will provide the full implementation
with an actual Playwright Page instance.

## Properties

### page

> **page**: `unknown`

Browser page instance.
Typed as `unknown` here to avoid a Playwright dependency in shared.
The web-worker package will cast this to Playwright's `Page` type.

***

### targetUrl

> **targetUrl**: `string`

The target URL being tested.
