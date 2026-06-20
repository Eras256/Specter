import type { Action } from './schemas.js';

export interface DestructiveMatch {
  matched: boolean;
  rule?: string;
  detail?: string;
}

/**
 * Deterministic, un-foolable rules for irreversible code/infra actions. These
 * run BEFORE any LLM signal — an LLM can be injected, a regex on `DROP TABLE`
 * cannot. A match is a hard `deny` (unless an out-of-band approval is attached).
 *
 * Each rule is a (id, regex, why) triple over the action's command string.
 */
interface Rule {
  id: string;
  test: RegExp;
  /** If present and it matches, the rule does NOT fire (e.g. a WHERE clause). */
  unless?: RegExp;
  why: string;
}

// A production-scoped resource token: `prod`, `production`, `prod_db`, `prod-cluster`.
const PROD = '(?:\\bprod\\b|\\bproduction\\b|\\bprod[_-]\\w+)';
const DESTRUCTIVE_VERB = '\\b(?:drop|delete|truncate|destroy|rm|terminate|wipe)\\b';

const RULES: Rule[] = [
  {
    id: 'sql.drop_table',
    test: /\bdrop\s+(table|database|schema)\b/i,
    why: 'DROP of a table/database/schema is irreversible',
  },
  {
    id: 'sql.truncate',
    test: /\btruncate\s+(table\s+)?\w/i,
    why: 'TRUNCATE wipes all rows irreversibly',
  },
  {
    // DELETE FROM / UPDATE that has no WHERE clause = affects every row.
    id: 'sql.unscoped_mutation',
    test: /\b(delete\s+from|update)\s+[`"\w.]+/i,
    unless: /\bwhere\b/i,
    why: 'DELETE/UPDATE without a WHERE clause affects every row',
  },
  {
    id: 'shell.rm_rf',
    test: /\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-rf|-fr)\b/i,
    why: 'rm -rf recursively force-deletes files',
  },
  {
    id: 'shell.disk_wipe',
    test: /\b(mkfs|dd\s+if=.*of=\/dev\/|:\(\)\s*\{.*\}\s*;)/i,
    why: 'disk format / fork-bomb / raw device write',
  },
  {
    id: 'secret.env_read',
    test: /(^|[\s/=:"'`])\.env(\.[\w.-]+)?(\b|$)|\/(secrets?|credentials?)\b|id_rsa|\.pem\b|\.aws\/credentials/i,
    why: 'reads of .env / secret / credential paths risk exfiltration',
  },
  {
    id: 'infra.prod_scope',
    test: new RegExp(
      `${PROD}[\\s\\S]*${DESTRUCTIVE_VERB}|${DESTRUCTIVE_VERB}[\\s\\S]*${PROD}`,
      'i',
    ),
    why: 'destructive verb targeting a production-scoped resource',
  },
  {
    id: 'git.force_push_main',
    test: /git\s+push\s+.*--force(-with-lease)?\b[\s\S]*\b(main|master|prod)\b|git\s+push\s+.*\b(main|master|prod)\b[\s\S]*--force/i,
    why: 'force-push to a protected branch rewrites shared history',
  },
];

/**
 * Returns the first matching destructive rule for an action's command, if any.
 * Only inspects `db_write` / `shell` / `file` / `other` commands — payments go
 * through the financial signals instead.
 */
export function checkDestructive(action: Pick<Action, 'type' | 'command'>): DestructiveMatch {
  const command = action.command;
  if (!command || typeof command !== 'string') return { matched: false };
  if (!['db_write', 'shell', 'file', 'other'].includes(action.type)) return { matched: false };

  for (const rule of RULES) {
    if (rule.test.test(command) && !(rule.unless && rule.unless.test(command))) {
      return { matched: true, rule: rule.id, detail: rule.why };
    }
  }
  return { matched: false };
}

export const __destructiveRules = RULES; // exported for tests
