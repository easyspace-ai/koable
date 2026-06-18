export type SignupTranslate = (key: string) => string;

export function getPasswordStrength(
  password: string,
  t: SignupTranslate,
): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: t("strength.weak"), color: "bg-red-500" };
  if (score <= 2) return { score, label: t("strength.fair"), color: "bg-orange-500" };
  if (score <= 3) return { score, label: t("strength.good"), color: "bg-yellow-500" };
  return { score, label: t("strength.strong"), color: "bg-green-500" };
}

export function getPasswordCriteria(password: string, t: SignupTranslate) {
  return [
    { label: t("criteria.minLength"), met: password.length >= 8 },
    { label: t("criteria.uppercase"), met: /[A-Z]/.test(password) },
    { label: t("criteria.lowercase"), met: /[a-z]/.test(password) },
    { label: t("criteria.number"), met: /\d/.test(password) },
    { label: t("criteria.special"), met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
