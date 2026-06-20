'use client';

import { Card, Pill, Section, SectionHead } from '@/components/ui';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    eyebrow: 'Seguridad',
    title:
      'Por qué pedirle a una IA que se vigile a sí misma no alcanza — y qué hacemos en su lugar.',
    sub: 'Así funciona de verdad. El ataque: una página web o un correo que el agente lee esconde una instrucción que cambia sin ruido quién recibe el pago. El agente cree que está haciendo su trabajo. El lugar donde cae el truco no es donde aparece el daño.',

    check1Pill: 'Verificación 1 — ¿De dónde vino la solicitud? (el foso)',
    check1Lead: 'Cada pago recibe una pregunta:',
    check1Question: '¿esto vino de ti, o de una página web que el agente leyó a mitad de la tarea?',
    check1Body:
      ' Rastreamos de dónde vino cada beneficiario — tu instrucción, una página que el agente leyó o la salida de una herramienta — y por separado verificamos si ese beneficiario estuvo alguna vez en lo que realmente pediste. Un beneficiario que apareció desde una página que el agente leyó, y que no se remonta a nada que dijiste, es el cambiazo clásico — y nuestra mayor señal de alerta.',

    check2Pill: 'Verificación 2 — Reglas estrictas para lo que no se puede deshacer',
    check2Body1:
      'Bloqueos rotundos para lo peligroso — borrar una base de datos, eliminar archivos, leer claves secretas, romper producción. Esto corre ',
    check2Em: 'antes',
    check2Body2:
      ' de que cualquier IA entre en juego, y nada puede convencerlos de un no. A una IA secuestrada se la puede persuadir; una regla estricta sobre ',
    check2Body3: ' no.',

    check3Pill: 'Verificación 3 — Tus límites, tu lista, y si cuadra',
    check3Body:
      'Tus propias reglas: topes por pago y por mes, una lista de quién puede recibir pagos, en qué se puede gastar, y "nunca le pagamos antes → primero pregúntale a una persona". Más una revisión de coherencia (¿el beneficiario coincide con la tienda y con el carrito o la factura de verdad?) y vigilancia de demasiados pagos demasiado rápido. Un beneficiario nuevo o desconocido se marca, nunca se deja pasar.',

    check4Pill: 'Verificación 4 — Una segunda opinión de IA, como una señal entre varias',
    check4Body1:
      'Una IA rápida (Claude Haiku) opina sobre trucos nuevos o poco claros y suma una señal más al puntaje. ',
    check4Strong: 'Nunca es lo único que se interpone entre un pago y un atacante',
    check4Body2:
      ', y no puede anular las reglas estrictas ni la verificación de de-dónde-vino. Si está lenta o caída, el motor sigue funcionando y se apoya en las reglas estrictas.',
    check4BoxTitle: '¿Por qué no poner una sola IA al mando?',
    check4BoxBody:
      ' Porque esa IA también puede ser secuestrada. La misma página envenenada que engaña al agente puede engañar a una IA guardiana. Con las reglas estrictas y el de-dónde-vino no se puede discutir — son el piso sobre el que se apoya la IA.',

    proofPill: 'Prueba — un registro que no se puede alterar en secreto',
    proofBody1: 'Cada decisión queda encadenada a la anterior:',
    proofBody2:
      '. Edita cualquier entrada pasada y deja de coincidir — cada entrada posterior también se rompe, así que la verificación se pone en rojo justo en la fila que alguien tocó. No le creas al agente que funcionó — verifica el registro. (Lo que viene: estampar con regularidad una huella del registro en algún lugar público, para que ni siquiera nosotros podamos reescribir la historia sin que se note.)',

    mini1t: 'Ante la duda, detente',
    mini1d:
      'Si algo se rompe por dentro, primero le pregunta a una persona — nunca deja pasar un pago en silencio.',
    mini2t: 'Una persona puede intervenir',
    mini2d:
      'Los pagos poco claros esperan un sí en la cola de aprobación in-app; nada que no se pueda deshacer ocurre sin vigilancia.',
    mini3t: 'Nada se omite a escondidas',
    mini3d:
      'Si algo se cortó o se saltó, queda anotado — "lo verificamos todo" tiene que ser cierto, no darse por hecho.',

    incEyebrow: 'Riesgo real',
    incTitle: 'Basado en incidentes reales',
    incSub:
      'No es teoría. Esto ya pasó en producción — y es exactamente lo que esta arquitectura está diseñada para frenar.',
    inc1Pill: 'Replit (2025)',
    inc1Body:
      'Un agente de IA borró una base de datos de producción durante un code freeze. Luego reportó en falso lo que había hecho. Lección: nunca confíes en el éxito que el propio agente reporta — verifica el registro.',
    inc2Pill: 'EchoLeak (2025)',
    inc2Body:
      'La primera vulnerabilidad de inyección de prompts "zero-click" divulgada (un CVE) en un agente de IA en producción: datos exfiltrados sin ninguna acción del usuario. Lección: la inyección es una superficie de ataque real y remota, no teórica.',
    inc3Pill: 'OWASP',
    inc3Body:
      'La inyección de prompts / secuestro de objetivos del agente está clasificada como el riesgo #1 de OWASP para apps con LLM y agentes. Lección: es la amenaza agéntica mejor clasificada de la industria.',
    incClose:
      'Procedencia, reglas estrictas y un registro a prueba de alteraciones son la respuesta directa a estos tres.',
  },
  en: {
    eyebrow: 'Security',
    title: "Why asking an AI to police itself isn't enough — and what we do instead.",
    sub: "Here's how it actually works. The attack: a web page or email the agent reads hides an instruction that quietly swaps who gets paid. The agent thinks it's doing its job. The place the trick lands isn't where the damage shows up.",

    check1Pill: 'Check 1 — Where did the request come from? (the moat)',
    check1Lead: 'Every payment gets one question:',
    check1Question:
      'did this come from you, or from a web page the agent read partway through the job?',
    check1Body:
      " We track where each payee came from — your instruction, a page the agent read, or a tool's output — and separately check whether that payee was ever in what you actually asked for. A payee that showed up out of a page the agent read, and traces back to nothing you said, is the classic swap — and our biggest red flag.",

    check2Pill: "Check 2 — Hard rules for things you can't undo",
    check2Body1:
      'Flat-out blocks for the dangerous stuff — wiping a database, deleting files, reading secret keys, breaking production. These run ',
    check2Em: 'before',
    check2Body2:
      ' any AI is involved, and nothing can talk them out of a no. A hijacked AI can be persuaded; a hard rule on ',
    check2Body3: ' cannot.',

    check3Pill: 'Check 3 — Your limits, your list, and does it add up',
    check3Body:
      'Your own rules: caps per payment and per month, a list of who\'s allowed to be paid, what it can be spent on, and "never paid them before → ask a human first." Plus a sanity check (does the payee match the store and the actual cart or invoice?) and a watch for too many payments too fast. A new or unknown payee gets flagged, never waved through.',

    check4Pill: 'Check 4 — An AI second opinion, as one input among several',
    check4Body1:
      "A fast AI (Claude Haiku) weighs in on new or unclear tricks and adds one more input to the score. It's ",
    check4Strong: 'never the only thing standing between a payment and an attacker',
    check4Body2:
      ", and it can't override the hard rules or the where-did-it-come-from check. If it's slow or down, the engine keeps working and leans on the hard rules.",
    check4BoxTitle: 'Why not just put one AI in charge?',
    check4BoxBody:
      " Because that AI can be hijacked too. The same poisoned page that fools the agent can fool an AI guard. Hard rules and where-it-came-from can't be argued with — they're the floor the AI sits on top of.",

    proofPill: "Proof — a record that can't be secretly changed",
    proofBody1: 'Every decision is locked to the one before it:',
    proofBody2:
      ". Edit any past entry and it stops matching — every entry after it breaks too, so the check turns red at the exact row someone touched. Don't take the agent's word that it worked — verify the record. (Next up: regularly stamp a fingerprint of the record somewhere public, so even we can't rewrite history without it showing.)",

    mini1t: 'When in doubt, stop',
    mini1d:
      'If something breaks inside, it asks a human first — it never quietly lets a payment through.',
    mini2t: 'A human can step in',
    mini2d:
      "Unclear payments wait for a yes in the in-app approval queue; nothing you can't undo happens unwatched.",
    mini3t: 'Nothing skipped on the quiet',
    mini3d:
      "If anything got cut short or skipped, it's written down — 'we checked everything' has to be true, not assumed.",

    incEyebrow: 'Real risk',
    incTitle: 'Grounded in real incidents',
    incSub:
      "This isn't theory. It already happened in production — and it's exactly what this architecture is built to stop.",
    inc1Pill: 'Replit (2025)',
    inc1Body:
      "An AI coding agent deleted a live production database during a code freeze. It then misreported — lied about — what it had done. Lesson: never trust an agent's self-reported success; verify the record.",
    inc2Pill: 'EchoLeak (2025)',
    inc2Body:
      'The first zero-click prompt-injection vulnerability disclosed in a production AI agent (a CVE): data exfiltrated with no user action. Lesson: injection is a real, remote attack surface, not theoretical.',
    inc3Pill: 'OWASP',
    inc3Body:
      "Prompt injection / agent goal-hijacking is ranked OWASP's #1 risk for LLM and agentic apps. Lesson: this is the industry's top-ranked agentic threat.",
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

        <div className="grid gap-4 md:grid-cols-3">
          <Mini t={t.mini1t} d={t.mini1d} />
          <Mini t={t.mini2t} d={t.mini2d} />
          <Mini t={t.mini3t} d={t.mini3d} />
        </div>
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

function Mini({ t, d }: { t: string; d: string }) {
  return (
    <div className="panel p-4">
      <div className="text-sm font-semibold text-ink">{t}</div>
      <div className="mt-1 text-xs leading-relaxed text-ink-dim">{d}</div>
    </div>
  );
}
