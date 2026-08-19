import { describe, expect, it } from "vitest";
import { canContactSecondExaminer, filterPendingRoleUsersForAdmin } from "./db";

describe("Sichtbarkeit ausstehender Rollenfreigaben", () => {
  it("zeigt internen Erstprüfer:innen nur der Verwaltung desselben Fachbereichs", () => {
    const pending = [
      { id: 1, name: "Regine Buchheim", requestedRole: "examiner", department: "FB2" },
      { id: 2, name: "Student anderer Fachbereich", requestedRole: "student", department: "FB2" },
      { id: 3, name: "Student eigener Fachbereich", requestedRole: "student", department: "FB3" },
      { id: 4, name: "Erstprüfer eigener Fachbereich", requestedRole: "examiner", department: "FB3" },
    ];

    expect(filterPendingRoleUsersForAdmin(pending, "FB3").map((user) => user.id)).toEqual([3, 4]);
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

  it("blendet Studierende und Erstprüfer:innen aus, wenn der Verwaltung kein Fachbereich zugeordnet ist", () => {
    const pending = [
      { id: 5, requestedRole: "student", department: "FB1" },
      { id: 6, requestedRole: "examiner", department: null },
    ];
    expect(filterPendingRoleUsersForAdmin(pending, null).map((user) => user.id)).toEqual([]);
  });

  it("lässt externe Zweitgutachter:innen sichtbar, ohne ein Fachbereichsrecht vorzutäuschen", () => {
    const pending = [
      { id: 7, requestedRole: "second_examiner", department: null },
      { id: 8, requestedRole: "examiner", department: "FB1" },
    ];
    expect(filterPendingRoleUsersForAdmin(pending, "FB3").map((user) => user.id)).toEqual([7]);
  });
});
