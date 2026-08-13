import { describe, expect, it } from "vitest";
import { isInternalExaminer, sortExaminersForStudentDepartment } from "../shared/examinerDepartmentPriority";

describe("fachbereichsorientierte Prüfer:innenpriorität", () => {
  const examiners = [
    { user: { id: 2 }, allowedDepartments: ["FB2"], profile: { department: "FB2" } },
    { user: { id: 1 }, allowedDepartments: ["FB3"], profile: { department: "FB3" } },
  ];

  it("priorisiert interne Prüfer:innen, ohne externe Betreuung auszuschließen", () => {
    expect(sortExaminersForStudentDepartment(examiners, "FB3").map((examiner) => examiner.user.id)).toEqual([1, 2]);
    expect(isInternalExaminer(examiners[1], "FB3")).toBe(true);
    expect(isInternalExaminer(examiners[0], "FB3")).toBe(false);
  });
});
