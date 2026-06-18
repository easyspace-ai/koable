"use client";

import { useState, useMemo, useCallback, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle,
} from "lucide-react";
import { getPasswordStrength, getPasswordCriteria } from "../signup/signup-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tAuth = useTranslations("auth");
  const t = useTranslations("dashboard");
  const translateReset = useCallback(
    (key: string) => t(`auth.resetPassword.${key}`),
    [t],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = useMemo(
    () => getPasswordStrength(password, translateReset),
    [password, translateReset],
  );
  const criteria = useMemo(
    () => getPasswordCriteria(password, translateReset),
    [password, translateReset],
  );

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <X className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">
          {translateReset("invalidLinkTitle")}
        </h2>
        <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          {translateReset("invalidLinkDescription")}
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          {translateReset("requestNewLink")}
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">
          {translateReset("successTitle")}
        </h2>
        <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          {translateReset("successDescription")}
        </p>
        <Button
          className="w-full rounded-xl bg-brand-700 text-white hover:bg-brand-800"
          onClick={() => router.push("/login")}
        >
          {tAuth("signIn")}
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(translateReset("passwordMismatch"));
      return;
    }

    if (strength.score < 2) {
      setError(translateReset("passwordTooWeak"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: translateReset("genericError") }));
        throw new Error(body.error ?? translateReset("genericError"));
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(translateReset("genericError"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700/10">
          <Lock className="h-6 w-6 text-brand-700" />
        </div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          {translateReset("title")}
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {translateReset("description")}
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
          <Label htmlFor="password">{translateReset("newPassword")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.signup.passwordPlaceholder")}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isLoading}
              className="rounded-xl pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? tAuth("hidePassword") : tAuth("showPassword")}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {password.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength.score
                          ? strength.color
                          : "bg-[hsl(var(--muted))]"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("auth.resetPassword.passwordStrength", { label: strength.label })}
                </p>
              </div>
              <div className="space-y-1">
                {criteria.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {c.met ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                    )}
                    <span
                      className={
                        c.met
                          ? "text-green-600 dark:text-green-400"
                          : "text-[hsl(var(--muted-foreground))]"
                      }
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{translateReset("confirmNewPassword")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={translateReset("confirmPlaceholder")}
              autoComplete="new-password"
              required
              disabled={isLoading}
              className="rounded-xl pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword ? tAuth("hidePassword") : tAuth("showPassword")
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {translateReset("passwordsDoNotMatch")}
            </p>
          )}
          {confirmPassword.length > 0 && confirmPassword === password && (
            <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" />
              {translateReset("passwordsMatch")}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl bg-brand-700 text-white hover:bg-brand-800"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {translateReset("resetting")}
            </>
          ) : (
            translateReset("resetButton")
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

function ResetPasswordFallback() {
  const t = useTranslations("dashboard");
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700/10">
        <Lock className="h-6 w-6 text-brand-700" />
      </div>
      <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
        {t("auth.resetPassword.title")}
      </h2>
      <div className="mt-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
