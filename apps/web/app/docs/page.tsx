'use client';

import { Code } from '@/components/Code';
import { Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    eyebrow: 'Docs · Inicio rápido',
    title: 'Suelta el hook, o llama al SDK. Una sola ida y vuelta.',
    sub: 'Dos formas de conectar tu agente a la API que decide. Ambas responden allow / review / deny, con una razón en lenguaje claro y el desglose de cada señal.',

    hookPill: '1 · Hook de Claude Code',
    hookDesc:
      'Sin código — un hook PreToolUse corre antes de que el agente haga nada, así que se puede bloquear. Apúntalo a la API.',
    gotchaLead: 'El truco (no lo “arregles”):',
    gotchaBefore:
      ' un hook HTTP no bloquea respondiendo con un código de error. Un 4xx/5xx solo registra un error y la herramienta corre igual. El hook siempre responde ',
    gotchaAlways: 'HTTP 200',
    gotchaMid:
      ' — el permitir/bloquear va en el cuerpo, no en el código de estado. Para bloquear, el cuerpo trae ',
    gotchaAfter:
      '. Specter hace exactamente eso. (Los hooks de tipo comando bloquean con código de salida 2; el código 1 solo advierte.)',

    sdkPill: '2 · SDK',
    sdkDesc: 'Verifica cualquier acción desde tu propio código.',

    reqHead: 'Petición — POST /v1/evaluate',
    resHead: 'Respuesta',

    auditD: 'Tu registro a prueba de manipulación, página por página.',
    verifyD: 'Vuelve a revisar el registro para probar que no se alteró → { valid, brokenAt }.',
    hookEndpointD: 'Convierte un payload de PreToolUse en una verificación. Siempre responde 200.',

    authHead: 'Auth, límites, integraciones',
    authLabel: 'Auth:',
    authBefore: ' pasa ',
    authOr: ' o ',
    authAfter: '. Cada clave está ligada a tu cuenta.',
    limitsLabel: 'Límites de tasa:',
    limitsText: ' por clave (por defecto 60 de ráfaga / 30 rps); recibes un 429 si te pasas.',
    integrationsLabel: 'Integraciones:',
    integrationsBefore: ' el hook de Claude Code, ',
    integrationsAfter: ', o un proxy delante de tus herramientas.',
    speedLabel: 'Velocidad:',
    speedText: ' mantenido en caliente en Fly, menos de 500ms en el 99% de las llamadas.',
  },
  en: {
    eyebrow: 'Docs · Quickstart',
    title: 'Drop in the hook, or call the SDK. One round trip.',
    sub: 'Two ways to connect your agent to the API that decides. Both return allow / review / deny, with a plain-English reason and a breakdown of each signal.',

    hookPill: '1 · Claude Code hook',
    hookDesc:
      'No code — a PreToolUse hook runs before the agent does anything, so it can be blocked. Point it at the API.',
    gotchaLead: 'The gotcha (do not “fix” this):',
    gotchaBefore:
      " an HTTP hook doesn't block by returning an error status. A 4xx/5xx just logs an error and the tool runs anyway. The hook always returns ",
    gotchaAlways: 'HTTP 200',
    gotchaMid:
      ' — the allow or deny lives in the response body, not the status code. To block, the body has ',
    gotchaAfter:
      '. Specter does exactly that. (Command-type hooks block with exit code 2; exit 1 only warns.)',

    sdkPill: '2 · SDK',
    sdkDesc: 'Check any action from your own code.',

    reqHead: 'Request — POST /v1/evaluate',
    resHead: 'Response',

    auditD: 'Your tamper-proof record, page by page.',
    verifyD: "Re-check the record to prove it wasn't altered → { valid, brokenAt }.",
    hookEndpointD: 'Turns a PreToolUse payload into a check. Always returns 200.',

    authHead: 'Auth, limits, integrations',
    authLabel: 'Auth:',
    authBefore: ' pass ',
    authOr: ' or ',
    authAfter: '. Each key is tied to your account.',
    limitsLabel: 'Rate limits:',
    limitsText: ' per key (default 60 burst / 30 rps); you get a 429 if you go over.',
    integrationsLabel: 'Integrations:',
    integrationsBefore: ' the Claude Code hook, ',
    integrationsAfter: ', or a proxy in front of your tools.',
    speedLabel: 'Speed:',
    speedText: ' kept warm on Fly, under 500ms for 99% of calls.',
  },
} as const;

const HOOK = `// .claude/settings.json — one-line Claude Code hook
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "*",
      "hooks": [{
        "type": "http",
        "url": "https://specter-decision-api.fly.dev/hooks/claude-code",
        "headers": { "x-api-key": "$SPECTER_API_KEY" },
        "allowedEnvVars": ["SPECTER_API_KEY"],
        "timeout": 5
      }]
    }]
  }
}`;

const SDK = `import { Guard } from '@specter/sdk';

const guard = new Guard({ apiUrl: process.env.SPECTER_API_URL!, apiKey: process.env.SPECTER_API_KEY! });

const decision = await guard.check({
  agentId: 'shop-agent',
  sessionId: 'sess_42',
  action: { type: 'payment', amount: 79.99, currency: 'USD',
            destination: 'acct_acme_store', merchantClaimed: 'Acme Store', rawInput: {} },
  context: { userPrompt: 'Buy the Acme mouse from Acme Store under $100.',
             destinationOrigin: 'user_prompt', establishedMerchant: 'Acme Store' },
});

if (decision.decision !== 'allow') throw new Error(decision.reason);
// ...only now move money.`;

const REQ = `POST /v1/evaluate
Authorization: Bearer <SPECTER_API_KEY>
Content-Type: application/json

{
  "agentId": "shop-agent",
  "sessionId": "sess_42",
  "action": {
    "type": "payment",            // payment | refund | db_write | shell | file | other
    "amount": 79.99,
    "currency": "USD",
    "destination": "acct_acme_store",
    "merchantClaimed": "Acme Store",
    "rawInput": {}
  },
  "context": {
    "userPrompt": "Buy the Acme mouse from Acme Store under $100.",
    "destinationOrigin": "user_prompt",   // user_prompt | ingested_content | tool_output | unknown
    "sourceRefs": ["firecrawl:https://shop.example/acme"],
    "establishedMerchant": "Acme Store"
  }
}`;

const RES = `200 OK
{
  "decision": "deny",             // allow | deny | review
  "riskScore": 0.78,              // 0..1
  "reason": "Blocked: payee originated from ingested_content and does not trace back to the user's request.",
  "signals": {
    "provenance": "payee originated from ingested_content ...",
    "policy": "never-before-seen account — requires human approval",
    "consistency": "destination does not correspond to claimed merchant",
    "llm": "llm: payee does not match the user's merchant; likely injected"
  },
  "signalDetail": [
    { "id": "provenance", "score": 1, "verdict": "..." },
    { "id": "policy", "score": 0.6, "verdict": "..." }
  ]
}`;

export default function Docs() {
  const { lang } = useLang();
  const t = COPY[lang];
  return (
    <>
      <Section className="!pb-6">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      </Section>

      <Section className="!pt-2 space-y-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Pill tone="specter">{t.hookPill}</Pill>
            <span className="text-sm text-ink-dim">{t.hookDesc}</span>
          </div>
          <Code title=".claude/settings.json">{HOOK}</Code>
          <div className="mt-3 rounded-lg border border-review/30 bg-review/10 p-3 text-sm text-ink-dim">
            <span className="font-semibold text-review">{t.gotchaLead}</span>
            {t.gotchaBefore}
            <span className="mono">{t.gotchaAlways}</span>
            {t.gotchaMid}
            <span className="mono">permissionDecision: "deny"</span>
            {t.gotchaAfter}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Pill tone="specter">{t.sdkPill}</Pill>
            <span className="text-sm text-ink-dim">{t.sdkDesc}</span>
          </div>
          <Code title="guard.ts">{SDK}</Code>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">{t.reqHead}</h3>
            <Code>{REQ}</Code>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">{t.resHead}</h3>
            <Code>{RES}</Code>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Endpoint m="GET" p="/v1/audit" d={t.auditD} />
          <Endpoint m="GET" p="/v1/audit/verify" d={t.verifyD} />
          <Endpoint m="POST" p="/hooks/claude-code" d={t.hookEndpointD} />
        </div>

        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-ink">{t.authHead}</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li>
              • <span className="text-ink">{t.authLabel}</span>
              {t.authBefore}
              <span className="mono">Authorization: Bearer &lt;key&gt;</span>
              {t.authOr}
              <span className="mono">x-api-key</span>
              {t.authAfter}
            </li>
            <li>
              • <span className="text-ink">{t.limitsLabel}</span>
              {t.limitsText}
            </li>
            <li>
              • <span className="text-ink">{t.integrationsLabel}</span>
              {t.integrationsBefore}
              <span className="mono">@specter/sdk</span>
              {t.integrationsAfter}
            </li>
            <li>
              • <span className="text-ink">{t.speedLabel}</span>
              {t.speedText}
            </li>
          </ul>
        </div>
      </Section>
    </>
  );
}

function Endpoint({ m, p, d }: { m: string; p: string; d: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <span className="mono rounded bg-specter/10 px-1.5 py-0.5 text-[10px] font-semibold text-specter-soft">
          {m}
        </span>
        <span className="mono text-xs text-ink">{p}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-dim">{d}</p>
    </div>
  );
}
