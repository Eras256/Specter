// @specter/sdk — the thin "plug". The Guard client calls the decision API; the
// Claude Code hook handler maps PreToolUse payloads to guard.check.

export * from './claude-code-hook.js';
export * from './guard.js';
