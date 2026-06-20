import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheckout, type ShoppingTask, type TaskOutcome } from './agent.js';
import { type FintualScenario, runFintualMove } from './fintual-agent.js';
import { SCENARIOS, type ScenarioName } from './scenarios.js';

// Load the repo-root .env (Node 22 native) so ANTHROPIC_API_KEY etc. are present.
try {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  process.loadEnvFile(join(root, '.env'));
} catch {
  /* no .env — MOCK mode */
}

interface Flags {
  scenario: ScenarioName | 'all';
  protection: boolean;
  llm: boolean;
  /** When set, scrape this real URL with Firecrawl instead of the fixtures. */
  url?: string;
  merchant?: string;
  prompt?: string;
  /** Fintual portfolio agent: 'legit' | 'injected' | 'all'. */
  fintual?: string;
}

function parseFlags(argv: string[]): Flags {
  // Take everything after the first '=' so URLs with query strings survive.
  const get = (name: string) => {
    const arg = argv.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.slice(name.length + 3) : undefined;
  };
  const scenario = (get('scenario') as Flags['scenario']) ?? 'all';
  const protection = (get('protection') ?? 'on') !== 'off';
  const llm = argv.includes('--llm');
  return {
    scenario,
    protection,
    llm,
    url: get('url'),
    merchant: get('merchant'),
    prompt: get('prompt'),
    fintual: get('fintual'),
  };
}

function banner(title: string) {
  const line = '─'.repeat(Math.max(title.length + 2, 60));
  console.log(`\n┌${line}┐\n│ ${title}\n└${line}┘`);
}

async function runTask(task: ShoppingTask, flags: Flags): Promise<TaskOutcome> {
  let outcome: TaskOutcome;
  if (flags.llm && process.env.ANTHROPIC_API_KEY) {
    const { runLlmCheckout } = await import('./llm-agent.js');
    outcome = await runLlmCheckout(task, { protection: flags.protection });
  } else {
    outcome = await runCheckout(task, { protection: flags.protection });
  }
  for (const line of outcome.narrative) console.log(`  ${line}`);
  return outcome;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const mode =
    flags.llm && process.env.ANTHROPIC_API_KEY ? 'LLM agent (AI SDK 6)' : 'deterministic agent';
  const prot = flags.protection ? 'ON' : 'OFF';

  console.log(`\n🛡️  Specter crash test — ${mode}, protection ${prot}`);

  // Live mode: scrape a REAL url with Firecrawl, then route the result through
  // Specter. The payee is tagged `ingested_content`, so a poisoned page is caught.
  if (flags.url) {
    const liveTask: ShoppingTask = {
      userPrompt: flags.prompt ?? `Complete the purchase from ${flags.url}.`,
      establishedMerchant: flags.merchant ?? new URL(flags.url).hostname,
      productUrl: flags.url,
      poisoned: false,
      agentId: 'shop-agent-prod',
    };
    banner(`live scrape: ${flags.url}  (protection ${prot})`);
    await runTask(liveTask, flags);
    console.log('');
    return;
  }

  // Fintual: an AI agent managing your investment portfolio. Reads real fund data
  // from Fintual's public API; Specter blocks a hijacked withdrawal.
  if (flags.fintual) {
    const scen: FintualScenario[] =
      flags.fintual === 'all' ? ['legit', 'injected'] : [flags.fintual as FintualScenario];
    for (const s of scen) {
      banner(`Fintual: ${s}  (protección ${prot})`);
      const outcome = await runFintualMove(s, { protection: flags.protection });
      for (const line of outcome.narrative) console.log(`  ${line}`);
    }
    console.log('');
    return;
  }

  const names: ScenarioName[] = flags.scenario === 'all' ? ['legit', 'injected'] : [flags.scenario];
  const outcomes: Array<{ name: ScenarioName; outcome: TaskOutcome }> = [];

  for (const name of names) {
    banner(`scenario: ${name}  (protection ${prot})`);
    const outcome = await runTask(SCENARIOS[name], flags);
    outcomes.push({ name, outcome });
  }

  // Closing scoreboard.
  banner('crash-test summary');
  let attacks = 0;
  let blocked = 0;
  let lost = 0;
  for (const { name, outcome } of outcomes) {
    const isAttack = name === 'injected';
    if (isAttack) attacks++;
    if (outcome.decision === 'allow') {
      console.log(
        `  ${name}: ALLOWED → paid ${outcome.extracted.currency} ${outcome.payment?.cappedAt}`,
      );
    } else if (outcome.decision === 'unprotected-paid') {
      console.log(`  ${name}: UNPROTECTED → money left the account 💸`);
      if (isAttack) lost += outcome.extracted.amount;
    } else {
      console.log(`  ${name}: ${outcome.decision.toUpperCase()} → $0 lost ✅`);
      if (isAttack) blocked++;
    }
  }
  if (attacks > 0) {
    console.log(
      `\n  Attacks: ${attacks}  ·  Blocked: ${flags.protection ? blocked : 0}/${attacks}  ·  $ lost: ${lost.toFixed(2)}`,
    );
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
