import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Locale } from '@/lib/carrier-audit/i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

const LOCALE_KEY = 'carrier_audit_locale';

function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && (saved === 'en' || saved === 'vi' || saved === 'th')) return saved;
  } catch {}
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: string) => {
    return translations[locale]?.[key] || translations.en[key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
