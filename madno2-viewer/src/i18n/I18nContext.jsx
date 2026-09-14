import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './translations';
import { I18nContext } from './context';

const STORAGE_KEY = 'madno2.lang';

/**
 * Detect the initial language.
 * Priority: explicit user choice (localStorage) > browser language > default (en).
 */
function detectInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private mode, blocked cookies)
  }

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const base = String(candidate).toLowerCase().split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(base)) {
      return base;
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Resolve a dot-separated key path against a translation object.
 */
function resolveKey(dictionary, key) {
  return key.split('.').reduce((acc, part) => (
    acc && typeof acc === 'object' ? acc[part] : undefined
  ), dictionary);
}

/**
 * Replace {placeholders} in a string with the supplied values.
 */
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies for this session
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => {
    const dictionary = translations[lang] || translations[DEFAULT_LANGUAGE];
    const fallback = translations[DEFAULT_LANGUAGE];

    /**
     * Translate a key. Returns the key itself when missing so that
     * untranslated strings are visible during development instead of blank.
     */
    const t = (key, params) => {
      const found = resolveKey(dictionary, key) ?? resolveKey(fallback, key);
      if (typeof found === 'string') return interpolate(found, params);
      if (found !== undefined) return found;
      return key;
    };

    /** Translate a key expected to hold an array (month names, weekday names). */
    const tList = (key) => {
      const found = resolveKey(dictionary, key) ?? resolveKey(fallback, key);
      return Array.isArray(found) ? found : [];
    };

    /** BCP 47 locale tag for Intl / toLocaleString formatting. */
    const locale = lang === 'es' ? 'es-ES' : 'en-GB';

    return { lang, setLang, t, tList, locale };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
