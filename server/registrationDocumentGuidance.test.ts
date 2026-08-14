import { describe, expect, it } from "vitest";
import { getRegistrationDocumentGuidance } from "../shared/registrationDocumentGuidance";

describe("Hinweis zur Einreichung des Anmeldedokuments", () => {
  it("benennt die Verwaltung des Fachbereichs und das Zielsemester", () => {
    const guidance = getRegistrationDocumentGuidance({ department: "FB4", targetSemester: "WS2026" });
    expect(guidance.department).toBe("FB4");
    expect(guidance.deadlineText).toContain("WS2026");
    expect(guidance.deadlineText).toContain("Verwaltung FB4");
  });

  it("verwendet verständliche Fallbacks bei fehlenden Angaben", () => {
    const guidance = getRegistrationDocumentGuidance({});
    expect(guidance.department).toBe("Ihres Fachbereichs");
    expect(guidance.semester).toBe("Ihres Zielsemesters");
  });
});
