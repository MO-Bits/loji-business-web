"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { translateToSwahili } from "./global-translations";

export type AppLanguage = "en" | "sw";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (english: string, swahili: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const translatedAttributes = ["placeholder", "title", "aria-label"] as const;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>("en");
  const originalText = useRef(new WeakMap<Text, string>());
  const originalAttributes = useRef(
    new WeakMap<Element, Partial<Record<(typeof translatedAttributes)[number], string>>>(),
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("loji-language");
    if (saved === "en" || saved === "sw") setLanguage(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("loji-language", language);

    const translateNode = (root: Node) => {
      const nodes: Node[] = [root];
      if (root instanceof Element || root instanceof DocumentFragment) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) nodes.push(walker.currentNode);
      }

      for (const node of nodes) {
        if (node instanceof Text) {
          const parent = node.parentElement;
          if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) continue;
          if (!originalText.current.has(node)) originalText.current.set(node, node.data);
          const source = originalText.current.get(node) ?? node.data;
          node.data = language === "sw" ? translateToSwahili(source) : source;
          continue;
        }

        if (node instanceof Element) {
          const stored = originalAttributes.current.get(node) ?? {};
          for (const attribute of translatedAttributes) {
            const current = node.getAttribute(attribute);
            if (current !== null && stored[attribute] === undefined) stored[attribute] = current;
            const source = stored[attribute];
            if (source !== undefined) {
              node.setAttribute(attribute, language === "sw" ? translateToSwahili(source) : source);
            }
          }
          originalAttributes.current.set(node, stored);
        }
      }
    };

    translateNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(translateNode);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
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

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
