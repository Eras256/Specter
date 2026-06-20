'use client';

import { useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';

const COPY = {
  es: {
    perTxCapLabel: 'Límite por transacción',
    perTxCapHint: 'Tope máximo para un solo pago.',
    merchantsLabel: 'Negocios aprobados',
    merchantsHint: 'Separados por comas. Beneficiarios de confianza.',
    approveNewLabel: 'Destino nuevo → requiere aprobación',
    approveNewHint: 'Nunca le pagues a una cuenta desconocida en silencio.',
    notificationEmailLabel: 'Email de notificaciones (opcional)',
    notificationEmailHint:
      'A dónde llegan los avisos de incidentes. La aprobación pasa en el panel.',
    monthlyCapNote: 'límite mensual fijado automáticamente en',
    saveButton: 'Guardar política',
    savedButton: '✓ Política guardada',
    resultingPolicy: 'política resultante',
    notificationEmailPlaceholder: 'you@company.com',
    dictate: 'Política por voz',
    dictateHint:
      'Habla tu regla (ej. "bloquea pagos sobre 500 a destinos nuevos") y la transcribimos a tu política.',
    dictateBtn: '🎙️ Dictar',
    stop: '⏹ Detener',
    transcribing: 'transcribiendo…',
    heard: 'Escuché:',
    micError: 'No se pudo acceder al micrófono.',
    sttError: 'No se pudo transcribir. Intenta de nuevo.',
  },
  en: {
    perTxCapLabel: 'Per-transaction cap',
    perTxCapHint: 'Hard ceiling for a single payment.',
    merchantsLabel: 'Approved merchants',
    merchantsHint: 'Comma-separated. Trusted beneficiaries.',
    approveNewLabel: 'New destination → require approval',
    approveNewHint: 'Never silently pay an unknown account.',
    notificationEmailLabel: 'Notification email (optional)',
    notificationEmailHint:
      'Where incident notifications go. The approval itself happens in the dashboard.',
    monthlyCapNote: 'monthly cap auto-set to',
    saveButton: 'Save policy',
    savedButton: '✓ Policy saved',
    resultingPolicy: 'resulting policy',
    notificationEmailPlaceholder: 'you@company.com',
    dictate: 'Voice policy',
    dictateHint:
      'Speak your rule (e.g. "block payments over 500 to new destinations") and we transcribe it into your policy.',
    dictateBtn: '🎙️ Dictate',
    stop: '⏹ Stop',
    transcribing: 'transcribing…',
    heard: 'Heard:',
    micError: 'Could not access the microphone.',
    sttError: 'Could not transcribe. Try again.',
  },
} as const;

// Spoken amount → number. Tries digits first, then Spanish/English number words
// ("seiscientos" → 600, "five hundred" → 500, "dos mil" → 2000).
const NUM_WORDS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900,
  mil: 1000,
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

function parseAmount(text: string): number | null {
  const digits = text.replace(/[,.]/g, '').match(/\d{2,7}/);
  if (digits) return Number(digits[0]);
  const tokens = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z]+/)
    .filter(Boolean);
  let total = 0;
  let current = 0;
  let matched = false;
  for (const tok of tokens) {
    const v = NUM_WORDS[tok];
    if (v === undefined) continue;
    matched = true;
    if (v === 1000) {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
    } else if (v === 100) {
      current = (current || 1) * 100;
    } else {
      current += v;
    }
  }
  const n = total + current;
  return matched && n >= 10 ? n : null;
}

/**
 * The control plane — deliberately low-friction (3–4 fields). 60-second setup is
 * a feature. Writes to Supabase in production; here it shows the resulting policy
 * JSON and confirms.
 */
export function PolicyWizard({ embedded = false }: { embedded?: boolean }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [perTxCap, setPerTxCap] = useState(500);
  const [merchants, setMerchants] = useState('Acme Store, CloudHost Inc, Figma');
  const [approveNew, setApproveNew] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Heuristic: map a spoken rule onto the policy fields. Amount (digits OR number
  // words) → per-tx cap; keywords → require-approval-on-new-destination.
  const applyTranscript = (text: string) => {
    const amount = parseAmount(text);
    if (amount !== null) setPerTxCap(amount);
    const lower = text.toLowerCase();
    if (
      /(sin aprob|no aprob|no requ|without approv|don'?t require|do not require|allow new)/.test(
        lower,
      )
    ) {
      setApproveNew(false);
    } else if (/(aprob|approv|nuevo|new|desconoc|unknown|requ)/.test(lower)) {
      setApproveNew(true);
    }
  };

  const transcribe = async (blob: Blob) => {
    setBusy(true);
    setVoiceErr(null);
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: blob });
      if (!res.ok) throw new Error('stt');
      const { text } = (await res.json()) as { text: string };
      setTranscript(text);
      applyTranscript(text);
    } catch {
      setVoiceErr(t.sttError);
    } finally {
      setBusy(false);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    setVoiceErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        for (const tr of stream.getTracks()) tr.stop();
        void transcribe(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setVoiceErr(t.micError);
    }
  };

  const policy = {
    perTxCap,
    monthlyCap: perTxCap * 10,
    allowlist: merchants
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    requireApprovalOnNewDestination: approveNew,
    notificationEmail: notificationEmail || undefined,
  };

  return (
    <div className={embedded ? '' : 'mx-auto max-w-xl'}>
      <div className="panel p-6">
        <div className="space-y-5">
          <div className="rounded-md border border-line bg-panel-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm font-medium text-ink">{t.dictate}</span>
                <p className="text-xs text-ink-faint">{t.dictateHint}</p>
              </div>
              <button
                type="button"
                onClick={toggleRecord}
                disabled={busy}
                className={`shrink-0 rounded-md border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                  recording
                    ? 'border-block/50 bg-block/10 text-block'
                    : 'border-line text-ink-dim hover:text-ink'
                }`}
              >
                {busy ? t.transcribing : recording ? t.stop : t.dictateBtn}
              </button>
            </div>
            {voiceErr && <p className="mt-2 text-xs text-block">{voiceErr}</p>}
            {transcript && (
              <p className="mt-2 text-xs text-ink-dim">
                <span className="text-ink-faint">{t.heard}</span> “{transcript}”
              </p>
            )}
          </div>

          <Field label={t.perTxCapLabel} hint={t.perTxCapHint}>
            <div className="flex items-center gap-2">
              <span className="text-ink-faint">$</span>
              <input
                type="number"
                value={perTxCap}
                onChange={(e) => setPerTxCap(Number(e.target.value))}
                className="w-32 rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none focus:border-specter/60"
              />
              <span className="mono text-xs text-ink-faint">{`${t.monthlyCapNote} $${perTxCap * 10}`}</span>
            </div>
          </Field>

          <Field label={t.merchantsLabel} hint={t.merchantsHint}>
            <input
              value={merchants}
              onChange={(e) => setMerchants(e.target.value)}
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none focus:border-specter/60"
            />
          </Field>

          <Field label={t.approveNewLabel} hint={t.approveNewHint}>
            <button
              type="button"
              onClick={() => setApproveNew((v) => !v)}
              className={`relative h-6 w-11 rounded-full border transition ${
                approveNew ? 'border-specter/60 bg-specter/30' : 'border-line bg-panel'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                  approveNew ? 'left-[22px] bg-specter' : 'left-0.5 bg-ink-faint'
                }`}
              />
            </button>
          </Field>

          <Field label={t.notificationEmailLabel} hint={t.notificationEmailHint}>
            <input
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder={t.notificationEmailPlaceholder}
              className="w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-specter/60"
            />
          </Field>

          <button
            type="button"
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2600);
            }}
            className="btn-primary w-full"
          >
            {saved ? t.savedButton : t.saveButton}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mono mb-2 text-[11px] text-ink-faint">{t.resultingPolicy}</div>
        <pre className="panel scroll-thin overflow-x-auto p-4">
          <code className="mono text-[12px] text-ink-dim">{JSON.stringify(policy, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-sm font-medium text-ink">{label}</span>
      <p className="mb-2 text-xs text-ink-faint">{hint}</p>
      {children}
    </div>
  );
}
