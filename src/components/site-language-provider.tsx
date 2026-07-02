"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCanonicalEnglishText, getLanguageCopy, SITE_COPY, type SiteLanguage, translateText } from "@/lib/site-language";

type SiteLanguageContextValue = {
  copy: Record<string, string>;
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
};

const SiteLanguageContext = createContext<SiteLanguageContextValue>({
  copy: SITE_COPY.pt,
  language: "pt",
  setLanguage: () => undefined,
  t: (key) => getLanguageCopy("pt", key),
  toggleLanguage: () => undefined,
});

const ORIGINAL_TEXT = new WeakMap<Text, string>();
const ORIGINAL_ATTRIBUTES = new WeakMap<Element, Map<string, string>>();
const LANGUAGE_STORAGE_KEY = "aptelys-language-v2";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;

function splitTextNodeValue(value: string) {
  const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);

  return {
    body: match?.[2].replace(/\s+/g, " ").trim() ?? "",
    prefix: match?.[1] ?? "",
    suffix: match?.[3] ?? "",
  };
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;

  if (!parent) {
    return true;
  }

  if (parent.closest("[data-no-translate]")) {
    return true;
  }

  if (parent.closest("[data-i18n-key]")) {
    return true;
  }

  return ["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"].includes(parent.tagName);
}

function translateTextNode(node: Text, language: SiteLanguage) {
  if (shouldSkipTextNode(node)) {
    return;
  }

  const currentValue = node.nodeValue ?? "";
  const { body, prefix, suffix } = splitTextNodeValue(currentValue);

  if (!body) {
    return;
  }

  const original = ORIGINAL_TEXT.get(node) ?? getCanonicalEnglishText(body);
  ORIGINAL_TEXT.set(node, original);

  const translated = translateText(original, language);
  const nextValue = `${prefix}${translated}${suffix}`;

  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function getOriginalAttribute(element: Element, attribute: string) {
  let originalAttributes = ORIGINAL_ATTRIBUTES.get(element);

  if (!originalAttributes) {
    originalAttributes = new Map<string, string>();
    ORIGINAL_ATTRIBUTES.set(element, originalAttributes);
  }

  const currentValue = element.getAttribute(attribute);

  if (!currentValue) {
    return null;
  }

  if (!originalAttributes.has(attribute)) {
    originalAttributes.set(attribute, getCanonicalEnglishText(currentValue.replace(/\s+/g, " ").trim()));
  }

  return originalAttributes.get(attribute) ?? currentValue;
}

function translateAttributes(root: ParentNode, language: SiteLanguage) {
  root.querySelectorAll<Element>("[data-i18n-aria], [data-i18n-placeholder], [data-i18n-title], [aria-label], [placeholder], [title]").forEach((element) => {
    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) {
        return;
      }

      const keyedAttribute =
        attribute === "aria-label"
          ? element.getAttribute("data-i18n-aria")
          : element.getAttribute(`data-i18n-${attribute}`);
      const original = keyedAttribute ? getLanguageCopy("en", keyedAttribute) : getOriginalAttribute(element, attribute);

      if (!original) {
        return;
      }

      const translated = keyedAttribute ? getLanguageCopy(language, keyedAttribute) : translateText(original, language);
      element.setAttribute(attribute, translated);
    });
  });
}

function translateKeyedElements(root: ParentNode, language: SiteLanguage) {
  root.querySelectorAll<HTMLElement>("[data-i18n-key]").forEach((element) => {
    const key = element.dataset.i18nKey;

    if (!key) {
      return;
    }

    const translated = getLanguageCopy(language, key);

    if (element.textContent !== translated) {
      element.textContent = translated;
    }
  });
}

function translateTextNodes(root: ParentNode, language: SiteLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    translateTextNode(currentNode as Text, language);
    currentNode = walker.nextNode();
  }
}

function applySiteLanguage(language: SiteLanguage) {
  document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  document.body.dataset.siteLanguage = language;

  translateKeyedElements(document.body, language);
  translateAttributes(document.body, language);
  translateTextNodes(document.body, language);
}

export function SiteLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>("pt");

  const setLanguage = useCallback((nextLanguage: SiteLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((currentLanguage) => (currentLanguage === "en" ? "pt" : "en"));
  }, []);

  const t = useCallback((key: string) => getLanguageCopy(language, key), [language]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (storedLanguage === "en" || storedLanguage === "pt") {
      const timeout = window.setTimeout(() => setLanguageState(storedLanguage), 0);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    let applying = false;
    let scheduledFrame = 0;
    let clearApplyingTimeout = 0;

    const apply = () => {
      applying = true;
      applySiteLanguage(language);
      window.clearTimeout(clearApplyingTimeout);
      clearApplyingTimeout = window.setTimeout(() => {
        applying = false;
      }, 0);
    };

    const scheduleApply = () => {
      if (applying || scheduledFrame) {
        return;
      }

      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        apply();
      });
    };

    apply();

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(scheduledFrame);
      window.clearTimeout(clearApplyingTimeout);
    };
  }, [language]);

  const value = useMemo(
    () => ({
      copy: SITE_COPY[language],
      language,
      setLanguage,
      t,
      toggleLanguage,
    }),
    [language, setLanguage, t, toggleLanguage],
  );

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  return useContext(SiteLanguageContext);
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useSiteLanguage();
  const [transition, setTransition] = useState<{ from: SiteLanguage; to: SiteLanguage } | null>(null);
  const nextLanguage = language === "en" ? "pt" : "en";

  function handleToggleLanguage() {
    if (transition) {
      return;
    }

    const targetLanguage = language === "en" ? "pt" : "en";
    setTransition({ from: language, to: targetLanguage });
    setLanguage(targetLanguage);
    window.setTimeout(() => {
      setTransition(null);
    }, 320);
  }

  return (
    <button
      aria-label={nextLanguage === "pt" ? t("dashboard.switchToPortuguese") : t("dashboard.switchToEnglish")}
      className={`language-toggle ${transition ? "is-switching" : ""} ${className}`}
      data-language={transition?.to ?? language}
      data-language-toggle
      data-no-translate
      onClick={handleToggleLanguage}
      type="button"
    >
      <span className={`language-toggle-label ${transition ? "language-toggle-label-out" : ""}`}>
        {(transition?.from ?? language).toUpperCase()}
      </span>
      {transition ? (
        <span className="language-toggle-label language-toggle-label-in">{transition.to.toUpperCase()}</span>
      ) : null}
    </button>
  );
}
