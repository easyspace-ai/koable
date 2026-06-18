"use client";

import { useState, useEffect, useMemo, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { getGitHubLoginUrl, getGoogleLoginUrl } from "@/lib/api";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";

import { getPasswordStrength, getPasswordCriteria, isValidEmail } from "./signup-utils";
import { GitHubIcon, GoogleIcon } from "./oauth-icons";

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const tAuth = useTranslations("auth");
  const t = useTranslations("dashboard");
  const translateSignup = useCallback(
    (key: string) => t(`auth.signup.${key}`),
    [t],
  );

  // Redirect after sign-up (honor returnTo, fall back to dashboard).
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      const urlPrompt = params.get("prompt");
      let target: string;
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        target = returnTo;
      } else if (urlPrompt) {
        target = `/dashboard?prompt=${encodeURIComponent(urlPrompt)}`;
      } else {
        target = "/dashboard";
      }
      router.replace(target);
    }
  }, [authLoading, isAuthenticated, router]);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<
    "github" | "google" | null
  >(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const strength = useMemo(
    () => getPasswordStrength(password, translateSignup),
    [password, translateSignup],
  );
  const criteria = useMemo(
    () => getPasswordCriteria(password, translateSignup),
    [password, translateSignup],
  );
  const emailValid = useMemo(() => isValidEmail(email), [email]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!emailValid) {
      setError(t("auth.signup.invalidEmail"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.signup.passwordMismatch"));
      return;
    }

    if (strength.score < 2) {
      setError(t("auth.signup.passwordTooWeak"));
      return;
    }

    if (!agreedToTerms) {
      setError(t("auth.signup.mustAgreeToTerms"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email,
        password,
        displayName: displayName || undefined,
      });
      if (result.pending) {
        setPendingMessage(result.message);
        setIsLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      const urlPrompt = params.get("prompt");
      let target: string;
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        target = returnTo;
      } else if (urlPrompt) {
        target = `/dashboard?prompt=${encodeURIComponent(urlPrompt)}`;
      } else {
        target = "/dashboard";
      }
      router.push(target);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "body" in err) {
        const apiErr = err as { body: { error: string } };
        setError(apiErr.body.error);
      } else {
        setError(t("auth.signup.genericError"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleOAuth(provider: "github" | "google") {
    setIsOAuthLoading(provider);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    const returnToRaw = params.get("returnTo");
    const returnTo =
      returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
        ? returnToRaw
        : null;
    window.location.href =
      provider === "github"
        ? getGitHubLoginUrl(returnTo)
        : getGoogleLoginUrl(returnTo);
  }

  const isFormDisabled = isLoading || isOAuthLoading !== null;

  if (pendingMessage) {
    return (
      <>
        <h2 className="mb-3 text-center text-xl font-semibold text-[hsl(var(--foreground))]">
          {tAuth("pendingTitle")}
        </h2>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-sm leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap">
          {pendingMessage}
        </div>
        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {t("auth.signup.alreadyApproved")}{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            {t("auth.signup.signIn")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-center text-xl font-semibold text-[hsl(var(--foreground))]">
        {t("auth.signup.title")}
      </h2>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full rounded-xl"
          disabled={isFormDisabled}
          onClick={() => handleOAuth("github")}
        >
          {isOAuthLoading === "github" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GitHubIcon className="mr-2 h-4 w-4" />
          )}
          {tAuth("continueWithGitHub")}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl"
          disabled={isFormDisabled}
          onClick={() => handleOAuth("google")}
        >
          {isOAuthLoading === "google" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          {tAuth("continueWithGoogle")}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[hsl(var(--border))]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[hsl(var(--card))] px-2 text-[hsl(var(--muted-foreground))]">
            {t("auth.signup.orSignUpWithEmail")}
          </span>
        </div>
      </div>

      {/* Registration Form */}
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
          <Label htmlFor="displayName">{t("auth.signup.displayName")}</Label>
          <Input
            id="displayName"
            type="text"
            placeholder={t("auth.signup.displayNamePlaceholder")}
            autoComplete="name"
            disabled={isFormDisabled}
            className="rounded-xl"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.login.emailPlaceholder")}
            autoComplete="email"
            required
            disabled={isFormDisabled}
            className={`rounded-xl ${
              emailTouched && email.length > 0 && !emailValid
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
            }`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
          />
          {emailTouched && email.length > 0 && !emailValid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("auth.signup.invalidEmailInline")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("common.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.signup.passwordPlaceholder")}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isFormDisabled}
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
              {/* Strength bar */}
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
                  {t("auth.signup.passwordStrength", { label: strength.label })}
                </p>
              </div>
              {/* Criteria checklist */}
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
          <Label htmlFor="confirmPassword">{t("auth.signup.confirmPassword")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.signup.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              required
              disabled={isFormDisabled}
              className="rounded-xl pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? tAuth("hidePassword") : tAuth("showPassword")}
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
              {t("auth.signup.passwordsDoNotMatch")}
            </p>
          )}
          {confirmPassword.length > 0 && confirmPassword === password && (
            <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check className="h-3 w-3" />
              {t("auth.signup.passwordsMatch")}
            </p>
          )}
        </div>

        {/* Terms of Service */}
        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--border))] bg-transparent text-brand-700 focus:ring-brand-700 focus:ring-offset-0"
          />
          <label
            htmlFor="terms"
            className="text-sm text-[hsl(var(--muted-foreground))] select-none cursor-pointer leading-snug"
          >
            {t.rich("auth.signup.agreeToTerms", {
              terms: (chunks) => (
                <a
                  href="/terms"
                  className="font-medium text-brand-700 hover:underline"
                  target="_blank"
                >
                  {chunks}
                </a>
              ),
              privacy: (chunks) => (
                <a
                  href="/privacy"
                  className="font-medium text-brand-700 hover:underline"
                  target="_blank"
                >
                  {chunks}
                </a>
              ),
            })}
          </label>
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl bg-brand-700 text-white hover:bg-brand-800"
          disabled={isFormDisabled}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("auth.signup.creatingAccount")}
            </>
          ) : (
            t("auth.signup.createAccount")
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
        {t("auth.signup.alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:underline"
        >
          {t("auth.signup.signIn")}
        </Link>
      </p>
    </>
  );
}
