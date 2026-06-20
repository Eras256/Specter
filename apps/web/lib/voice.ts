'use client';

// Spoken incident alert for the dashboard. Uses the browser's built-in speech
// synthesis (zero-dependency, works offline, no key to leak). ElevenLabs can
// upgrade the voice via a server route later (roadmap) without changing callers.
export function speakIncident(text: string, lang: 'es' | 'en'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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
