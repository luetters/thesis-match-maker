export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  categoryCount: number;
  meetsRequirements: boolean;
  hasMinimumLength: boolean;
  hasRequiredVariety: boolean;
};

/**
 * Bewertet ausschließlich den aktuell eingegebenen Wert im Arbeitsspeicher.
 * Das Passwort wird weder gespeichert noch protokolliert.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const hasLowercase = /[a-zäöüß]/.test(password);
  const hasUppercase = /[A-ZÄÖÜ]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-zÄÖÜäöüß0-9\s]/.test(password);
  const categoryCount = [hasLowercase, hasUppercase, hasDigit, hasSymbol].filter(Boolean).length;
  const hasMinimumLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasRequiredVariety = categoryCount >= 3;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (hasMinimumLength) score += 1;
  if (categoryCount >= 2) score += 1;
  if (hasRequiredVariety) score += 1;
  if (password.length >= 16 && categoryCount >= 3) score += 1;

  return {
    score: Math.min(score, 4) as PasswordStrength["score"],
    categoryCount,
    hasMinimumLength,
    hasRequiredVariety,
    meetsRequirements: password.length <= PASSWORD_MAX_LENGTH && hasMinimumLength && hasRequiredVariety,
  };
}

export function getPasswordPolicyError(password: string): string | null {
  const strength = getPasswordStrength(password);
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen enthalten.`;
  }
  if (!strength.hasMinimumLength) {
    return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  }
  if (!strength.hasRequiredVariety) {
    return "Das Passwort muss Zeichen aus mindestens drei Gruppen enthalten: Kleinbuchstaben, Großbuchstaben, Ziffern und Sonderzeichen.";
  }
  return null;
}
