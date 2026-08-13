import { describe, expect, it } from "vitest";
import { getStudentConsentFlags } from "./studentConsent";

describe("getStudentConsentFlags", () => {
  it("speichert beide optionalen Zustimmungen für Studierende", () => {
    expect(getStudentConsentFlags("student", true, true)).toEqual({ plagiarismConsent: 1, aiReviewConsent: 1 });
  });

  it("bewahrt nicht erteilte Einwilligungen als 0", () => {
    expect(getStudentConsentFlags("student", false, undefined)).toEqual({ plagiarismConsent: 0, aiReviewConsent: 0 });
  });

  it("speichert Einwilligungswerte nicht für andere Registrierungsrollen", () => {
    expect(getStudentConsentFlags("examiner", true, true)).toEqual({ plagiarismConsent: 0, aiReviewConsent: 0 });
  });
});
