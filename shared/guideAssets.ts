export const GUIDE_PDF_URLS = {
  firstExaminer: "/manus-storage/thesis-match-maker-erste-pruefung-leitfaden_c75ce61d.pdf",
  secondExaminer: "/manus-storage/thesis-match-maker-zweite-pruefung-leitfaden_0cc76265.pdf",
  administration: "/manus-storage/thesis-match-maker-verwaltung-leitfaden_35a36afd.pdf",
} as const;

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
