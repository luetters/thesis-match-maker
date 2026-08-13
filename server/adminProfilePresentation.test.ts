import { describe, expect, it } from "vitest";
import { getAdminScopeBadgeLabel, shouldShowAdminScope } from "../shared/adminProfilePresentation";

describe("Verwaltungsprofil-Zuständigkeiten", () => {
  it("zeigt die Zuständigkeitskarte ausschließlich für Verwaltungsmitarbeiter:innen", () => {
    expect(shouldShowAdminScope("admin")).toBe(true);
    expect(shouldShowAdminScope("examiner")).toBe(false);
    expect(shouldShowAdminScope("superadmin")).toBe(false);
  });

  it("bildet das Fachbereichsrecht im Rollenbadge ab", () => {
    expect(getAdminScopeBadgeLabel("FB3")).toBe("Verwaltung · FB3");
    expect(getAdminScopeBadgeLabel(null)).toBe("Verwaltung");
  });
});
