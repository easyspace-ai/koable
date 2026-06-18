import type { Locale } from "./types";

const LOCALE_STORAGE_KEY = "doable_locale";
const DEFAULT_LOCALE: Locale = "en";

const listeners = new Set<(locale: Locale) => void>();

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh-CN";
}

export function getLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) {
    return stored;
  }

  const browser = window.navigator.language;
  if (browser.startsWith("zh")) {
    return "zh-CN";
  }

  return DEFAULT_LOCALE;
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
