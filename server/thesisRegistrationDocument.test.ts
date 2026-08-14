import { describe, expect, it } from "vitest";
import { hasCompleteCommission } from "./thesisRegistrationDocument";

describe("offizielles Anmeldedokument", () => {
  it("ist erst nach bestätigter vollständiger interner Kommission verfügbar", () => {
    expect(hasCompleteCommission({ examinerId: 11, secondExaminerId: 22, status: "SECOND_EXAMINER_ACCEPTED" })).toBe(true);
    expect(hasCompleteCommission({ examinerId: 11, secondExaminerId: 22, status: "PENDING_SECOND_EXAMINER" })).toBe(false);
  });

  it("akzeptiert eine vollständige Kommission mit externem Zweitgutachten", () => {
    expect(hasCompleteCommission({
      examinerId: 11,
      externalSecondExaminerTitle: "Prof.",
      externalSecondExaminerFirstName: "Mira",
      externalSecondExaminerLastName: "Beispiel",
      status: "SECOND_EXAMINER_ACCEPTED",
    })).toBe(true);
  });

  it("verweigert das Dokument ohne Erst- oder Zweitgutachten", () => {
    expect(hasCompleteCommission({ examinerId: 11, status: "MATCHED" })).toBe(false);
    expect(hasCompleteCommission({ secondExaminerId: 22, status: "MATCHED" })).toBe(false);
  });
});
