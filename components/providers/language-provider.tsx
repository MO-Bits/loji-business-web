"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translateToSwahili } from "@/components/providers/global-translations";

export type AppLanguage = "en" | "sw";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (english: string, swahili: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const originals = useRef(new WeakMap<Text, string>());
  const originalAttributes = useRef(new WeakMap<Element, Record<string, string>>());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("loji-language");
      if (saved === "en" || saved === "sw") setLanguage(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("loji-language", language);

    const attributes = ["placeholder", "title", "aria-label"] as const;
    let applying = false;

    const translateText = (node: Text) => {
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(node.parentElement?.tagName ?? "")) return;
      const value = node.nodeValue ?? "";
      if (!value.trim()) return;
      if (!originals.current.has(node)) originals.current.set(node, value);
      const source = originals.current.get(node) ?? value;
      const text = source.trim();
      node.nodeValue = source.replace(text, language === "sw" ? translateToSwahili(text) : text);
    };

    const translateElement = (element: Element) => {
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return;
      const saved = originalAttributes.current.get(element) ?? {};
      attributes.forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        saved[attribute] ??= value;
        element.setAttribute(attribute, language === "sw" ? translateToSwahili(saved[attribute]) : saved[attribute]);
      });
      originalAttributes.current.set(element, saved);
    };

    const translateTree = (root: Node) => {
      applying = true;
      if (root instanceof Text) translateText(root);
      if (root instanceof Element) translateElement(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node instanceof Text) translateText(node);
        if (node instanceof Element) translateElement(node);
      }
      queueMicrotask(() => { applying = false; });
    };

    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      if (applying) return;
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") translateTree(mutation.target);
        mutation.addedNodes.forEach(translateTree);
      });
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (english, swahili) => (language === "sw" ? swahili : english),
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value)
    throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
