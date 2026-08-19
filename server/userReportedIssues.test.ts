import { describe, expect, it } from "vitest";
import { canContactSecondExaminer, filterPendingRoleUsersForAdmin } from "./db";

describe("Sichtbarkeit ausstehender Rollenfreigaben", () => {
  it("zeigt ausstehende Prüfer:innen auch fachbereichsübergreifend an", () => {
    const pending = [
      { id: 1, name: "Regine Buchheim", requestedRole: "examiner", department: "FB2" },
      { id: 2, name: "Student anderer Fachbereich", requestedRole: "student", department: "FB2" },
      { id: 3, name: "Student eigener Fachbereich", requestedRole: "student", department: "FB3" },
    ];

    expect(filterPendingRoleUsersForAdmin(pending, "FB3").map((user) => user.id)).toEqual([1, 3]);
  });

  it("zeigt Verwaltungsrollen sichtbar an, ohne daraus ein Freigaberecht abzuleiten", () => {
    const pending = [{ id: 4, requestedRole: "admin", department: "FB1" }];
    expect(filterPendingRoleUsersForAdmin(pending, "FB3")).toEqual(pending);
  });

  it("verbietet Zweitgutachter:innen die Erinnerungsaktion an Erstgutachter:innen", () => {
    expect(canContactSecondExaminer({ request: { examinerId: 10, secondExaminerId: 20 } as any, userId: 20, userRole: "second_examiner" })).toBe(false);
    expect(canContactSecondExaminer({ request: { examinerId: 10 }, userId: 10, userRole: "examiner" })).toBe(true);
    expect(canContactSecondExaminer({ request: { examinerId: 10 }, userId: 99, userRole: "superadmin" })).toBe(true);
  });

  it("begrenzt Studierende bei fehlender Fachbereichszuordnung vollständig", () => {
    const pending = [
      { id: 5, requestedRole: "student", department: "FB1" },
      { id: 6, requestedRole: "examiner", department: null },
    ];
    expect(filterPendingRoleUsersForAdmin(pending, null).map((user) => user.id)).toEqual([6]);
  });
});
