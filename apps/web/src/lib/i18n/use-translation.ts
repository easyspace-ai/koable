"use client";

import { useEffect, useMemo, useState } from "react";
import { getLocale, subscribeLocale } from "./locale";
import { getMessages } from "./messages";
import { translate } from "./translate";
import type { Locale, MessageNamespace, TranslationParams } from "./types";

export function useTranslation(namespace: MessageNamespace) {
  const [locale, setLocale] = useState<Locale>(() => getLocale());

  useEffect(() => subscribeLocale(setLocale), []);

  const messages = useMemo(() => getMessages(namespace, locale), [namespace, locale]);

  return {
    locale,
    t: (key: string, params?: TranslationParams) => translate(messages, key, params),
  };
}
