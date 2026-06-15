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
// ─── Status-Farben und Labels (zentrale Quelle) ─────────────────────────────

/**
 * Tailwind-CSS-Klassen für Status-Badges (bg + text).
 * Farbschema:
 *   Amber  – PENDING, PENDING_STUDENT_CONFIRMATION
 *   Blau   – PENDING_FIRST_EXAMINER, PENDING_SECOND_EXAMINER, MATCHED
 *   Grün   – FIRST_EXAMINER_ACCEPTED, SECOND_EXAMINER_ASSIGNED, ACCEPTED, COMPLETED, REGISTERED
 *   Rot    – REJECTED, FIRST_EXAMINER_REJECTED
 *   Grau   – WITHDRAWN, DRAFT_BY_EXAMINER, CANCELLED
 */
export const STATUS_BADGE: Record<string, { label: string; className: string; hex: string }> = {
  PENDING:                      { label: "Ausstehend",                    className: "bg-amber-100 text-amber-800 border border-amber-200",   hex: "#F59E0B" },
  PENDING_STUDENT_CONFIRMATION: { label: "Wartet auf Ihre Bestätigung",   className: "bg-amber-100 text-amber-800 border border-amber-200",   hex: "#F59E0B" },
  PENDING_FIRST_EXAMINER:       { label: "Wartet auf Erstgutachter:in",   className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
  PENDING_SECOND_EXAMINER:      { label: "Wartet auf Zweitgutachter:in",  className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
  MATCHED:                      { label: "Zugeteilt",                     className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
  FIRST_EXAMINER_ACCEPTED:      { label: "Erstgutachter:in zugestimmt",   className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  SECOND_EXAMINER_ASSIGNED:     { label: "Zweitgutachter:in zugewiesen",  className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  ACCEPTED:                     { label: "Angenommen",                    className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  COMPLETED:                    { label: "Abgeschlossen",                 className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  REGISTERED:                   { label: "Angemeldet",                    className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  SECOND_EXAMINER_SET:          { label: "Zweitgutachter:in gesetzt",     className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
  REJECTED:                     { label: "Abgelehnt",                     className: "bg-red-100 text-red-800 border border-red-200",       hex: "#EF4444" },
  FIRST_EXAMINER_REJECTED:      { label: "Erstgutachter:in abgelehnt",    className: "bg-red-100 text-red-800 border border-red-200",       hex: "#EF4444" },
  WITHDRAWN:                    { label: "Zurückgezogen",                 className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
  DRAFT_BY_EXAMINER:            { label: "Entwurf (Prüfer:in)",           className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
  CANCELLED:                    { label: "Storniert",                     className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
};

/** Gibt className + label für einen Status zurück (Fallback: grau). */
export function getStatusBadge(status: string) {
  return STATUS_BADGE[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border border-gray-200", hex: "#9CA3AF" };
}

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
