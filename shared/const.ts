export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
export const BROWSER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
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
export const STATUS_BADGE: Record<string, { label: string; enLabel: string; className: string; hex: string }> = {
	  PENDING:                      { label: "Ausstehend",                  enLabel: "Pending",                              className: "bg-amber-100 text-amber-800 border border-amber-200",   hex: "#F59E0B" },
	  PENDING_STUDENT_CONFIRMATION: { label: "Wartet auf Ihre Bestätigung", enLabel: "Awaiting your confirmation",           className: "bg-amber-100 text-amber-800 border border-amber-200",   hex: "#F59E0B" },
	  PENDING_FIRST_EXAMINER:       { label: "Wartet auf Erstgutachter:in", enLabel: "Awaiting first examiner",              className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
	  PENDING_SECOND_EXAMINER:      { label: "Wartet auf Zweitgutachter:in",enLabel: "Awaiting second examiner",             className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
	  MATCHED:                      { label: "Zugeteilt",                   enLabel: "Matched",                              className: "bg-blue-100 text-blue-800 border border-blue-200",     hex: "#3B82F6" },
	  FIRST_EXAMINER_ACCEPTED:      { label: "Erstgutachter:in zugestimmt", enLabel: "First examiner accepted",              className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  SECOND_EXAMINER_ASSIGNED:     { label: "Zweitgutachter:in zugewiesen",enLabel: "Second examiner assigned",             className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  SECOND_EXAMINER_ACCEPTED:     { label: "Zweitgutachter:in zugestimmt",enLabel: "Second examiner accepted",             className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  ACCEPTED:                     { label: "Angenommen",                  enLabel: "Accepted",                             className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  COMPLETED:                    { label: "Abgeschlossen",               enLabel: "Completed",                            className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  REGISTERED:                   { label: "Angemeldet",                  enLabel: "Registered",                           className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  SECOND_EXAMINER_SET:          { label: "Zweitgutachter:in gesetzt",   enLabel: "Second examiner selected",             className: "bg-green-100 text-green-800 border border-green-200",  hex: "#22C55E" },
	  REJECTED:                     { label: "Abgelehnt",                   enLabel: "Rejected",                             className: "bg-red-100 text-red-800 border border-red-200",       hex: "#EF4444" },
	  FIRST_EXAMINER_REJECTED:      { label: "Erstgutachter:in abgelehnt",  enLabel: "First examiner rejected",              className: "bg-red-100 text-red-800 border border-red-200",       hex: "#EF4444" },
	  CONDITIONAL_ACCEPTANCE:       { label: "Zusage unter Vorbehalt",      enLabel: "Conditional acceptance",               className: "bg-amber-100 text-amber-800 border border-amber-200",  hex: "#F59E0B" },
	  WITHDRAWN:                    { label: "Zurückgezogen",               enLabel: "Withdrawn",                            className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
	  DRAFT_BY_EXAMINER:            { label: "Entwurf (Prüfer:in)",         enLabel: "Examiner draft",                       className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
	  CANCELLED:                    { label: "Storniert",                   enLabel: "Cancelled",                            className: "bg-gray-100 text-gray-600 border border-gray-200",    hex: "#9CA3AF" },
};

/** Gibt className + label für einen Status zurück (Fallback: grau). */
export function getStatusBadge(status: string, language: "de" | "en" = "de") {
	const statusBadge = STATUS_BADGE[status];
	if (!statusBadge) return { label: status, className: "bg-gray-100 text-gray-600 border border-gray-200", hex: "#9CA3AF" };
	return { ...statusBadge, label: language === "en" ? statusBadge.enLabel : statusBadge.label };
}

/**
 * Gibt die Initialen aus Vor- und Nachname zurück (je 1. Buchstabe).
 * Akademischer Titel wird bewusst ignoriert.
 * Fallback: erstes und zweites Wort des name-Feldes, dann E-Mail-Anfang.
 */
export function getInitialsFromParts(opts: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const first = opts.firstName?.trim();
  const last = opts.lastName?.trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();
  // Fallback: name-Feld (ohne Titel – letzten und ersten Buchstaben der Wörter)
  if (opts.name) {
    const parts = opts.name.trim().split(/\s+/);
    // Überspringe bekannte Titel-Präfixe
    const titlePrefixes = new Set(["prof.", "dr.", "prof", "dr", "dipl.", "dipl", "ing.", "ing"]);
    const nameParts = parts.filter(p => !titlePrefixes.has(p.toLowerCase()));
    if (nameParts.length >= 2) return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    if (nameParts.length === 1) return nameParts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return opts.name.slice(0, 2).toUpperCase();
  }
  if (opts.email) return opts.email.slice(0, 2).toUpperCase();
  return "??";
}

/**
 * Tailwind-CSS-Klassen für Rollen-Badges (bg + text + border).
 * Jede Rolle erhält eine eigene Farbe für schnelle visuelle Unterscheidung.
 */
export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  student:           { label: "Studierende:r",       className: "bg-sky-100 text-sky-800 border border-sky-200" },
  examiner:          { label: "Prüfer:in",            className: "bg-violet-100 text-violet-800 border border-violet-200" },
  second_examiner:   { label: "Zweitprüfer:in",       className: "bg-purple-100 text-purple-800 border border-purple-200" },
  admin:             { label: "Admin",                className: "bg-rose-100 text-rose-800 border border-rose-200" },
  superadmin:        { label: "Superadmin",           className: "bg-red-100 text-red-800 border border-red-200" },
  user:              { label: "Nutzer:in",            className: "bg-gray-100 text-gray-700 border border-gray-200" },
  pav:               { label: "PA-Vorsitzende:r",     className: "bg-teal-100 text-teal-800 border border-teal-200" },
  dean:              { label: "Dekan:in",             className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  vice_dean:         { label: "Prodekan:in",          className: "bg-green-100 text-green-800 border border-green-200" },
  programme_director:{ label: "Studiengangsleitung",  className: "bg-amber-100 text-amber-800 border border-amber-200" },
};

/** Gibt className + label für eine Rolle zurück (Fallback: grau). */
export function getRoleBadge(role: string) {
  return ROLE_BADGE[role] ?? { label: role, className: "bg-gray-100 text-gray-700 border border-gray-200" };
}

export function buildFullName(opts: {
  firstName?: string | null;
  lastName?: string | null;
  academicTitle?: string | null;
  name?: string | null;
}): string {
  const hasFirst = !!opts.firstName?.trim();
  const hasLast = !!opts.lastName?.trim();
  // Wenn weder Vorname noch Nachname vorhanden: name-Feld als Fallback nutzen
  // (Legacy-Datensätze haben nur das name-Feld befüllt)
  if (!hasFirst && !hasLast) {
    return opts.name?.trim() ?? "";
  }
  const parts: string[] = [];
  if (opts.academicTitle?.trim()) parts.push(opts.academicTitle.trim());
  if (hasFirst) parts.push(opts.firstName!.trim());
  if (hasLast) parts.push(opts.lastName!.trim());
  return parts.join(" ");
}
