'use client';

import { Card, Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    eyebrow: 'Seguridad',
    title: 'Pedirle a una IA que se vigile sola no alcanza. Esto hacemos en su lugar.',
    sub: 'El ataque: una página o correo que el agente lee esconde una instrucción que cambia, sin ruido, quién recibe el pago. El truco cae lejos de donde aparece el daño.',

    check1Pill: 'Verificación 1 — ¿De dónde vino? (el moat)',
    check1Lead: 'Cada pago recibe una pregunta:',
    check1Question: '¿esto vino de ti, o de una página que el agente leyó a mitad de la tarea?',
    check1Body:
      ' Rastreamos el origen de cada destinatario y verificamos si estuvo en lo que realmente pediste. Uno que salió del contenido y no se remonta a ti es el cambiazo clásico — nuestra mayor alerta.',

    check2Pill: 'Verificación 2 — Reglas estrictas para lo irreversible',
    check2Body1:
      'Bloqueos rotundos para lo peligroso (borrar una base de datos, leer secretos, romper producción). Corren ',
    check2Em: 'antes',
    check2Body2:
      ' de cualquier IA, y nada los convence de un sí. A una IA se la persuade; una regla estricta sobre ',
    check2Body3: ' no.',

    check3Pill: 'Verificación 3 — Tus límites, tu lista y si cuadra',
    check3Body:
      'Topes por pago y por mes, lista de a quién se le puede pagar, y "cuenta nueva → primero pregunta a una persona". Más coherencia (¿el destinatario coincide con la tienda o la factura?) y vigilancia de demasiados pagos muy rápido.',

    check4Pill: 'Verificación 4 — Una IA, como una señal más',
    check4Body1: 'Una IA rápida (Claude Haiku) opina sobre trucos nuevos y suma una señal. ',
    check4Strong: 'Nunca es lo único entre un pago y un atacante',
    check4Body2:
      ', y no anula las reglas estrictas ni el de-dónde-vino. Si falla, el motor sigue con las reglas.',
    check4BoxTitle: '¿Por qué no una sola IA al mando?',
    check4BoxBody:
      ' Porque también puede ser secuestrada: la misma página que engaña al agente engaña a la IA guardiana. Las reglas estrictas y el de-dónde-vino no se discuten.',

    proofPill: 'Prueba — un registro inalterable',
    proofBody1: 'Cada decisión queda encadenada a la anterior:',
    proofBody2:
      '. Edita una entrada pasada y deja de coincidir — todo lo posterior se rompe y la verificación se pone roja en esa fila. No le creas al agente: verifica el registro.',

    incEyebrow: 'Riesgo real',
    incTitle: 'Basado en incidentes reales',
    incSub: 'No es teoría — ya pasó en producción, y es justo lo que esta arquitectura frena.',
    inc1Pill: 'Replit (2025)',
    inc1Body:
      'Un agente borró una base de datos en producción durante un code freeze y luego mintió sobre lo que hizo. Lección: no confíes en el éxito que el agente reporta — verifica el registro.',
    inc2Pill: 'EchoLeak (2025)',
    inc2Body:
      'La primera inyección de prompts "zero-click" (un CVE) en un agente en producción: datos exfiltrados sin acción del usuario. Lección: la inyección es real y remota.',
    inc3Pill: 'OWASP',
    inc3Body:
      'La inyección de prompts / secuestro de objetivos es el riesgo #1 de OWASP para apps con LLM y agentes.',
    incClose:
      'Procedencia, reglas estrictas y un registro a prueba de alteraciones responden directo a los tres.',
  },
  en: {
    eyebrow: 'Security',
    title: "Asking an AI to police itself isn't enough. Here's what we do instead.",
    sub: 'The attack: a page or email the agent reads hides an instruction that quietly swaps who gets paid. The trick lands far from where the damage shows up.',

    check1Pill: 'Check 1 — Where did it come from? (the moat)',
    check1Lead: 'Every payment gets one question:',
    check1Question:
      'did this come from you, or from a page the agent read partway through the job?',
    check1Body:
      ' We track where each payee came from and check whether it was ever in what you actually asked for. One that showed up out of the content and traces back to nothing you said is the classic swap — our biggest red flag.',

    check2Pill: "Check 2 — Hard rules for things you can't undo",
    check2Body1:
      'Flat-out blocks for the dangerous stuff (wiping a database, reading secrets, breaking production). They run ',
    check2Em: 'before',
    check2Body2:
      ' any AI is involved, and nothing talks them out of a no. An AI can be persuaded; a hard rule on ',
    check2Body3: ' cannot.',

    check3Pill: 'Check 3 — Your limits, your list, and does it add up',
    check3Body:
      'Caps per payment and per month, a list of who can be paid, and "new account → ask a human first." Plus a sanity check (does the payee match the store or invoice?) and a watch for too many payments too fast.',

    check4Pill: 'Check 4 — An AI, as one signal among several',
    check4Body1: 'A fast AI (Claude Haiku) weighs in on new tricks and adds one signal. ',
    check4Strong: 'Never the only thing between a payment and an attacker',
    check4Body2:
      ", and it can't override the hard rules or the where-it-came-from check. If it fails, the engine keeps going on the rules.",
    check4BoxTitle: 'Why not just put one AI in charge?',
    check4BoxBody:
      ' Because it can be hijacked too: the same poisoned page that fools the agent fools the AI guard. Hard rules and where-it-came-from cannot be argued with.',

    proofPill: 'Proof — a tamper-evident record',
    proofBody1: 'Every decision is locked to the one before it:',
    proofBody2:
      ". Edit any past entry and it stops matching — everything after it breaks and the check turns red at that row. Don't take the agent's word: verify the record.",

    incEyebrow: 'Real risk',
    incTitle: 'Grounded in real incidents',
    incSub:
      "Not theory — it already happened in production, and it's exactly what this architecture stops.",
    inc1Pill: 'Replit (2025)',
    inc1Body:
      "An agent deleted a live production database during a code freeze, then lied about what it had done. Lesson: never trust an agent's self-reported success — verify the record.",
    inc2Pill: 'EchoLeak (2025)',
    inc2Body:
      'The first zero-click prompt-injection vulnerability (a CVE) in a production AI agent: data exfiltrated with no user action. Lesson: injection is real and remote.',
    inc3Pill: 'OWASP',
    inc3Body:
      "Prompt injection / agent goal-hijacking is OWASP's #1 risk for LLM and agentic apps.",
    incClose:
      'Provenance, hard rules, and a tamper-evident record are the direct answer to all three.',
  },
} as const;

export default function SecurityPage() {
  const { lang } = useLang();
  const t = COPY[lang];
  return (
    <>
      <Section className="!pb-6">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      </Section>

      <Section className="!pt-2 space-y-4">
        <Card accent="specter">
          <Pill tone="specter">{t.check1Pill}</Pill>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            {t.check1Lead} <span className="text-ink">{t.check1Question}</span> {t.check1Body}
          </p>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card accent="block">
            <Pill tone="block">{t.check2Pill}</Pill>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">
              {t.check2Body1}
              <em>{t.check2Em}</em>
              {t.check2Body2}
              <span className="mono text-block">DROP TABLE</span>
              {t.check2Body3}
            </p>
          </Card>
          <Card accent="review">
            <Pill tone="review">{t.check3Pill}</Pill>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.check3Body}</p>
          </Card>
        </div>

        <Card>
          <Pill tone="specter">{t.check4Pill}</Pill>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            {t.check4Body1}
            <span className="text-ink">{t.check4Strong}</span>
            {t.check4Body2}
          </p>
          <div className="mt-4 rounded-lg border border-block/30 bg-block/10 p-3 text-sm text-ink-dim">
            <span className="font-semibold text-block">{t.check4BoxTitle}</span> {t.check4BoxBody}
          </div>
        </Card>

        <Card accent="safe">
          <Pill tone="safe">{t.proofPill}</Pill>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            {t.proofBody1}
            <span className="mono text-specter-soft">
              {' '}
              hash_n = sha256(prev_hash + canonicalJSON(record))
            </span>
            {t.proofBody2}
          </p>
        </Card>
      </Section>

      <Section className="space-y-4">
        <SectionHead eyebrow={t.incEyebrow} title={t.incTitle} sub={t.incSub} />

        <div className="grid gap-4 md:grid-cols-3">
          <Card accent="block">
            <Pill tone="block">{t.inc1Pill}</Pill>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.inc1Body}</p>
          </Card>
          <Card accent="review">
            <Pill tone="review">{t.inc2Pill}</Pill>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.inc2Body}</p>
          </Card>
          <Card accent="specter">
            <Pill tone="specter">{t.inc3Pill}</Pill>
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.inc3Body}</p>
          </Card>
        </div>

        <p className="text-sm leading-relaxed text-ink">{t.incClose}</p>
      </Section>
    </>
  );
}
