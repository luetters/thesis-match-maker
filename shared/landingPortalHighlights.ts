export type LandingPortalHighlights = {
  registeredUsers: number;
  thesisRequests: number;
  confirmedCommissions: number;
};

export function buildLandingPortalMetrics(highlights?: LandingPortalHighlights | null) {
  return [
    { value: highlights ? String(highlights.registeredUsers) : "—", label: "Registrierte Nutzer:innen" },
    { value: highlights ? String(highlights.thesisRequests) : "—", label: "Abschlussarbeitsanfragen" },
    { value: highlights ? String(highlights.confirmedCommissions) : "—", label: "Bestätigte Kommissionen" },
  ];
}
