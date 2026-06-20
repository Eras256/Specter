'use client';

// Lightweight client-side i18n. Spanish is the primary language; English is the
// secondary. Each page/component keeps its own bilingual COPY = { es, en } object
// and reads the active locale via useLang(). The choice persists in localStorage
// + a cookie so it survives reloads.

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export type Locale = 'es' | 'en';
export const DEFAULT_LOCALE: Locale = 'es';
const STORAGE_KEY = 'specter-lang';

interface LangCtx {
  lang: Locale;
  setLang: (l: Locale) => void;
}

const Ctx = createContext<LangCtx>({ lang: DEFAULT_LOCALE, setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate the saved choice on mount (SSR always renders the default = Spanish).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === 'es' || saved === 'en') setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep <html lang> in sync for accessibility / SEO.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Locale) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${STORAGE_KEY}=${l};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

/** Active locale + setter. Use in any client component. */
export function useLang(): LangCtx {
  return useContext(Ctx);
}

/** Pick the right side of a bilingual COPY object for the active locale. */
export function useCopy<T>(copy: { es: T; en: T }): T {
  const { lang } = useLang();
  return copy[lang];
}
