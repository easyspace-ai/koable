"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ForgotPasswordPage() {
  const tAuth = useTranslations("auth");
  const t = useTranslations("dashboard");
  const translateForgot = useCallback(
    (key: string) => t(`auth.forgotPassword.${key}`),
    [t],
  );

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: translateForgot("requestFailed") }));
        throw new Error(body.error ?? translateForgot("requestFailed"));
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(translateForgot("genericError"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">
          {translateForgot("successTitle")}
        </h2>
        <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          {t("auth.forgotPassword.successDescription", { email })}
        </p>
        <p className="mb-6 text-xs text-[hsl(var(--muted-foreground))]">
          {translateForgot("successHintBefore")}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setEmail("");
            }}
            className="font-medium text-brand-700 hover:underline"
          >
            {translateForgot("tryAgainLink")}
          </button>
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {tAuth("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700/10">
          <Mail className="h-6 w-6 text-brand-700" />
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          {translateForgot("title")}
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {translateForgot("description")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zM8 11a1 1 0 110 2 1 1 0 010-2z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{translateForgot("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={tAuth("emailPlaceholder")}
            autoComplete="email"
            required
            disabled={isLoading}
            className="rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl bg-brand-700 text-white hover:bg-brand-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {translateForgot("sending")}
            </>
          ) : (
            translateForgot("sendButton")
          )}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tAuth("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
