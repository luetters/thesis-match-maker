import { describe, expect, it } from "vitest";
import { matchesAdminRequestFilters, type AdminRequestFilterInput } from "../shared/adminRequestFilters";

const baseFilters: AdminRequestFilterInput = {
  statusFilters: [], secondExaminerFilters: [], department: "ALL", programme: "ALL", semester: "ALL", search: "",
};

const request = {
  status: "REJECTED", title: "Digitale Services", department: "FB3", programmeId: 12,
  programmeAbbreviation: "BWL", targetSemester: "WiSe 2026/27", studentName: "Mia Muster",
  wantedSecondExaminerId: 44, secondExaminerRejectedAt: "2026-08-01T00:00:00.000Z",
};

describe("kombinierbare Filter der Verwaltungsanfragen", () => {
  it("kombiniert Status, Fachbereich, Studiengang, Semester und Zweitgutachter-Status", () => {
    expect(matchesAdminRequestFilters(request, {
      ...baseFilters, statusFilters: ["REJECTED"], secondExaminerFilters: ["REJECTED"],
      department: "FB3", programme: "12", semester: "WiSe 2026/27",
    })).toBe(true);
  });

  it("lässt mehrere Statuswerte zu und schließt unpassende Kombinationen aus", () => {
    expect(matchesAdminRequestFilters(request, { ...baseFilters, statusFilters: ["PENDING", "REJECTED"] })).toBe(true);
    expect(matchesAdminRequestFilters(request, { ...baseFilters, department: "FB2" })).toBe(false);
    expect(matchesAdminRequestFilters(request, { ...baseFilters, secondExaminerFilters: ["ACCEPTED"] })).toBe(false);
  });
});
