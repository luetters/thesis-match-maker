import { describe, expect, it } from "vitest";
import { formatConsentForExport, getThesisConsentFlags } from "./studentConsent";

describe("getThesisConsentFlags", () => {
  it("speichert beide optionalen Zustimmungen für eine konkrete Thesis-Anfrage", () => {
    expect(getThesisConsentFlags(true, true)).toEqual({ plagiarismConsent: 1, aiReviewConsent: 1 });
  });

  it("bewahrt nicht erteilte Einwilligungen als 0", () => {
    expect(getThesisConsentFlags(false, undefined)).toEqual({ plagiarismConsent: 0, aiReviewConsent: 0 });
  });

  it("formatiert Einwilligungen für den Verwaltungsdatenexport eindeutig", () => {
    expect(formatConsentForExport(1)).toBe("Ja");
    expect(formatConsentForExport(true)).toBe("Ja");
    expect(formatConsentForExport(0)).toBe("Nein");
    expect(formatConsentForExport(null)).toBe("Nein");
  });
});
