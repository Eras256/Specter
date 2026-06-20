'use client';

// Spoken alerts + sound for the dashboard / live demo. Text-to-speech prefers
// ElevenLabs (premium voice, accent per language) via the same-origin /api/voice
// route — key stays server-side — and falls back to the browser's speech synthesis.
//
// SINGLE CHANNEL: only one voice ever plays at a time. Each speak() aborts the
// previous (in-flight fetch + playing audio + browser speech), so rapid calls
// (e.g. a batch of incidents) never overlap into a chorus.

let token = 0;
let currentAudio: HTMLAudioElement | null = null;
let currentController: AbortController | null = null;

function stopCurrent(): void {
  currentController?.abort();
  currentController = null;
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/** Speak arbitrary text aloud (one at a time). ElevenLabs first, browser fallback. */
export function speak(text: string, lang: 'es' | 'en' = 'es'): void {
  if (typeof window === 'undefined' || !text.trim()) return;
  stopCurrent();
  const my = ++token;
  const controller = new AbortController();
  currentController = controller;
  void playElevenLabs(text, lang, my, controller.signal).catch((err) => {
    // Fall back only if this is still the latest call and it wasn't superseded.
    if (my === token && (err as Error)?.name !== 'AbortError') speakBrowser(text, lang);
  });
}

/** Spoken incident alert (kept for existing callers). */
export function speakIncident(text: string, lang: 'es' | 'en'): void {
  speak(text, lang);
}

/**
 * Short alert sound when a payment is blocked (ElevenLabs-generated, served
 * statically). Best-effort — browsers block autoplay until a user gesture.
 */
export function playAlert(): void {
  if (typeof window === 'undefined') return;
  try {
    const a = new Audio('/sounds/blocked.mp3');
    a.volume = 0.5;
    void a.play().catch(() => {});
  } catch {
    /* audio unavailable — silent */
  }
}

async function playElevenLabs(
  text: string,
  lang: 'es' | 'en',
  my: number,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, lang }),
    signal,
  });
  if (!res.ok) throw new Error(`voice route ${res.status}`);
  if (my !== token) return; // a newer speak() superseded this one while fetching
  const blob = await res.blob();
  if (!blob.size) throw new Error('empty audio');
  if (my !== token) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  });
  await audio.play(); // rejects if autoplay is blocked → caller falls back
}

function speakBrowser(text: string, lang: 'es' | 'en'): void {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* speech synthesis unavailable — silent */
  }
}
