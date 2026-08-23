export { runWebEngine } from './runner.js';
export type { WebEngineConfig } from './runner.js';

// Re-export built-in rules for convenience
export { ConsoleErrorsRule } from './rules/console-errors.js';
export { FailedRequestsRule } from './rules/failed-requests.js';
export { FormsRule } from './rules/forms.js';
export { PageStructureRule } from './rules/page-structure.js';
export { PerformanceRule } from './rules/performance.js';
export { SecurityHeadersRule } from './rules/security-headers.js';
export { CookieSecurityRule } from './rules/cookie-security.js';
export { MixedContentRule } from './rules/mixed-content.js';
export { AiWidgetRule } from './rules/ai-widget.js';
export { ActiveFuzzRule } from './rules/active-fuzz.js';
