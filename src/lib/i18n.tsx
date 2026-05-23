"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../../locales/en.json";
import hi from "../../locales/hi.json";
import ml from "../../locales/ml.json";

export type Locale = "en" | "hi" | "ml";

const STORAGE_KEY = "sarva-locale";

const dictionaries: Record<Locale, Record<string, string>> = { en, hi, ml };

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}>({ locale: "en", setLocale: () => undefined, t: (key) => dictionaries.en[key] });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in dictionaries) {
      window.setTimeout(() => setLocaleState(saved), 0);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next;
        document.documentElement.dir = "ltr";
      },
      t: (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
