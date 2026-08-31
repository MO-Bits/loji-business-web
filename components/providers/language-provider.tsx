"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { translateToSwahili } from "@/components/providers/global-translations";

export type AppLanguage = "en" | "sw";

type LanguageContextValue = {
  language: AppLanguage;
  locale: "en-TZ" | "sw-TZ";
  setLanguage: (language: AppLanguage) => void;
  t: (english: string, swahili?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const languagePreferenceKey = "loji-language-preference:v2";
const legacyLanguageKey = "loji-language";
const defaultLanguage: AppLanguage = "sw";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(languagePreferenceKey);
    } catch {
      return;
    }
    if (saved !== "en" && saved !== "sw") return;
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.lang = saved;
      setLanguageState(saved);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    document.documentElement.lang = nextLanguage;
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(languagePreferenceKey, nextLanguage);
      window.localStorage.setItem(legacyLanguageKey, nextLanguage);
    } catch {
      // Language selection still applies when browser storage is unavailable.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: language === "sw" ? "sw-TZ" : "en-TZ",
      setLanguage,
      t: (english, swahili) =>
        language === "sw"
          ? swahili ?? translateToSwahili(english)
          : english,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
