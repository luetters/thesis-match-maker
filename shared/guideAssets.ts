export const GUIDE_PDF_URLS = {
  firstExaminer: "/manus-storage/thesis-match-maker-erste-pruefung-leitfaden_9f379a35.pdf",
  secondExaminer: "/manus-storage/thesis-match-maker-zweite-pruefung-leitfaden_35492f84.pdf",
  administration: "/manus-storage/thesis-match-maker-verwaltung-leitfaden_d81de219.pdf",
} as const;

export const GUIDE_DOWNLOAD_KEYS = ["first_examiner", "second_examiner", "administration"] as const;
export type GuideDownloadKey = (typeof GUIDE_DOWNLOAD_KEYS)[number];

export function isGuideDownloadKey(value: string): value is GuideDownloadKey {
  return (GUIDE_DOWNLOAD_KEYS as readonly string[]).includes(value);
}

/** Sitzungsschlüssel ohne Personen-, Geräte- oder Netzwerkbezug für die lokale Klickdämpfung. */
export function getGuideDownloadSessionKey(guideKey: GuideDownloadKey) {
  return `thesis-match-guide-download:${guideKey}`;
}

export type ExaminerGuideRole = "examiner" | "second_examiner";
export type GuideAudience = "firstExaminer" | "secondExaminer" | "administration";

export function getExaminerGuide(role?: ExaminerGuideRole) {
  if (role === "examiner") {
    return {
      url: GUIDE_PDF_URLS.firstExaminer,
      deLabel: "Leitfaden für die Erstprüfung",
      enLabel: "First examiner guide",
    } as const;
  }
  if (role === "second_examiner") {
    return {
      url: GUIDE_PDF_URLS.secondExaminer,
      deLabel: "Leitfaden für die Zweitprüfung",
      enLabel: "Second examiner guide",
    } as const;
  }
  return null;
}

/**
 * Der gerade aktive Rollenmodus erhält Vorrang. Weitere Rollen dienen nur als
 * Fallback, damit Mehrfachrollen keine fachfremden Hinweise sehen.
 */
export function getDashboardGuideAudience(activeRole?: string, roles: string[] = []): GuideAudience | null {
  const candidates = [activeRole, ...roles.filter((role) => role !== activeRole)];
  for (const role of candidates) {
    if (role === "examiner") return "firstExaminer";
    if (role === "second_examiner") return "secondExaminer";
    if (["admin", "pav", "dean", "vice_dean", "programme_director", "superadmin"].includes(role ?? "")) return "administration";
  }
  return null;
}
