import { describe, expect, it } from "vitest";
import { buildLandingPortalMetrics } from "../shared/landingPortalHighlights";

describe("Startseitenkennzahlen", () => {
  it("zeigt nur bereitgestellte, aggregierte Portalkennzahlen an", () => {
    expect(buildLandingPortalMetrics({ registeredUsers: 59, thesisRequests: 35, confirmedCommissions: 28 }))
      .toEqual([
        { value: "59", label: "Registrierte Nutzer:innen" },
        { value: "35", label: "Abschlussarbeitsanfragen" },
        { value: "28", label: "Bestätigte Kommissionen" },
      ]);
  });

  it("verwendet während des Ladens keine erfundenen Zahlen", () => {
    expect(buildLandingPortalMetrics()).toEqual([
      { value: "—", label: "Registrierte Nutzer:innen" },
      { value: "—", label: "Abschlussarbeitsanfragen" },
      { value: "—", label: "Bestätigte Kommissionen" },
    ]);
  });
});
