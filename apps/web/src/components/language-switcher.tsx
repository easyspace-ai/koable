"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  setLocaleCookie,
  type Locale,
} from "@/i18n/config";

type LanguageSwitcherProps = {
  className?: string;
  variant?: "menu-item" | "standalone";
};

export function LanguageSwitcher({
  className,
  variant = "standalone",
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(nextLocale: Locale) {
    if (nextLocale === locale) return;
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleCookie(nextLocale);
    startTransition(() => {
      router.refresh();
    });
  }

  if (variant === "menu-item") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
            isPending && "opacity-60",
            className,
          )}
        >
          <Languages className="mr-2 h-4 w-4" />
          {t("language")}
          <span className="ml-auto text-xs text-muted-foreground">
            {LOCALE_LABELS[locale]}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {LOCALES.map((code) => (
            <DropdownMenuItem
              key={code}
              className="focus:bg-accent focus:text-accent-foreground"
              onClick={() => handleSelect(code)}
            >
              {LOCALE_LABELS[code]}
              {code === locale && (
                <span className="ml-auto text-xs text-brand-600 dark:text-brand-400">
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors outline-none",
          isPending && "opacity-60",
          className,
        )}
        aria-label={t("language")}
      >
        <Languages className="h-4 w-4" />
        <span>{LOCALE_LABELS[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            className="focus:bg-accent focus:text-accent-foreground"
            onClick={() => handleSelect(code)}
          >
            {LOCALE_LABELS[code]}
            {code === locale && (
              <span className="ml-auto text-xs text-brand-600 dark:text-brand-400">
                ✓
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
