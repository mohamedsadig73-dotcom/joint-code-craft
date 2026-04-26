import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import enTranslations from '@/locales/en';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

// English is bundled eagerly (small, used as fallback). Arabic is lazy-loaded.
type Translations = typeof enTranslations;

const loadedTranslations: Partial<Record<Language, Translations>> = {
  en: enTranslations,
};

let arabicLoadingPromise: Promise<Translations> | null = null;

function loadArabic(): Promise<Translations> {
  if (loadedTranslations.ar) return Promise.resolve(loadedTranslations.ar);
  if (!arabicLoadingPromise) {
    arabicLoadingPromise = import('@/locales/ar').then((mod) => {
      const ar = mod.default as unknown as Translations;
      loadedTranslations.ar = ar;
      return ar;
    });
  }
  return arabicLoadingPromise;
}

// Cache the context on globalThis so HMR reloads of this module reuse the same
// React context object. Otherwise, after an HMR update the Provider (mounted by
// App.tsx, which is NOT reloaded) keeps the old context while consumers read
// from a new context object — causing "useLanguage must be used within
// LanguageProvider" errors on the live preview.
const __LC_KEY = '__DTS_LANGUAGE_CONTEXT__';
const __g = globalThis as unknown as Record<string, unknown>;
const LanguageContext: React.Context<LanguageContextType | undefined> =
  (__g[__LC_KEY] as React.Context<LanguageContextType | undefined>) ??
  (__g[__LC_KEY] = createContext<LanguageContextType | undefined>(undefined));

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('app-language') : null;
    return (saved as Language) || 'ar';
  });

  // Force re-render when async translations finish loading
  const [, setReady] = useState(0);

  // Ensure the active language is loaded
  useEffect(() => {
    if (language === 'ar' && !loadedTranslations.ar) {
      loadArabic().then(() => setReady((n) => n + 1));
    }
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const newLang: Language = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('app-language', newLang);
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      // Preload the new language if not already loaded
      if (newLang === 'ar' && !loadedTranslations.ar) {
        loadArabic().then(() => setReady((n) => n + 1));
      }
      return newLang;
    });
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = loadedTranslations[language] ?? loadedTranslations.en;
      return (dict as Record<string, string>)[key] ?? key;
    },
    [language]
  );

  // Centralised RTL/LTR handling on <html> and <body>
  useEffect(() => {
    const isRTL = language === 'ar';
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    htmlElement.lang = language;
    htmlElement.dir = isRTL ? 'rtl' : 'ltr';
    bodyElement.dir = isRTL ? 'rtl' : 'ltr';

    if (isRTL) {
      htmlElement.classList.add('rtl');
      htmlElement.classList.remove('ltr');
      bodyElement.style.textAlign = 'right';
    } else {
      htmlElement.classList.add('ltr');
      htmlElement.classList.remove('rtl');
      bodyElement.style.textAlign = 'left';
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="font-sans"
        style={{
          direction: language === 'ar' ? 'rtl' : 'ltr',
          textAlign: language === 'ar' ? 'right' : 'left',
        }}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
