export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Setzt den vollständigen Namen aus Titel, Vorname und Nachname zusammen.
 * Fehlende Teile werden einfach weggelassen.
 * Fallback: wenn weder firstName noch lastName vorhanden, wird name zurückgegeben.
 */
export function buildFullName(opts: {
  firstName?: string | null;
  lastName?: string | null;
  academicTitle?: string | null;
  name?: string | null;
}): string {
  const parts: string[] = [];
  if (opts.academicTitle?.trim()) parts.push(opts.academicTitle.trim());
  if (opts.firstName?.trim()) parts.push(opts.firstName.trim());
  if (opts.lastName?.trim()) parts.push(opts.lastName.trim());
  if (parts.length > 0) return parts.join(" ");
  return opts.name?.trim() ?? "";
}
