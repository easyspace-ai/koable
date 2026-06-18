"use client";

import { useLocale, useTranslations } from "next-intl";
import type { MessageNamespace } from "./types";

/** Client hook — wraps next-intl for typed message namespaces. */
export function useTranslation(namespace: MessageNamespace) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  return { t, locale };
}
