'use client';

import { type Locale, useLang } from '@/lib/i18n';

/** Compact ES/EN switch for the navbar. Spanish is primary. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  const langs: Locale[] = ['es', 'en'];
  return (
    <fieldset
      className="flex items-center rounded-md border border-line bg-panel-2 p-0.5"
      aria-label="Language"
    >
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded px-2 py-1 text-xs font-semibold transition ${
            lang === l ? 'bg-specter/20 text-specter-soft' : 'text-ink-faint hover:text-ink'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </fieldset>
  );
}
