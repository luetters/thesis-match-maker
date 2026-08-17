import { describe, expect, it } from "vitest";
import { consentLabel, getVerificationTextLayout, hasEmbeddedHtwPdfLogo } from "./thesisPdf";

describe("Thesis-PDF-Vorlage", () => {
  it("findet das eingebettete HTW-Berlin-Logo", () => {
    expect(hasEmbeddedHtwPdfLogo()).toBe(true);
  });

  it("setzt alle Texte der Verifizierung nacheinander ohne Überlappung", () => {
    const layout = getVerificationTextLayout(500, 18, 18, 24);
    expect(layout.englishY).toBeGreaterThanOrEqual(layout.germanY + 18 + 4);
    expect(layout.urlY).toBeGreaterThanOrEqual(layout.englishY + 18 + 6);
    expect(layout.tokenY).toBeGreaterThanOrEqual(layout.urlY + 24 + 6);
  });

  it("gibt auch nicht erteilte optionale Einwilligungen eindeutig aus", () => {
    expect(consentLabel(1)).toBe("Einverstanden / Consented");
    expect(consentLabel(true)).toBe("Einverstanden / Consented");
    expect(consentLabel(0)).toBe("Nicht erteilt / Not granted");
    expect(consentLabel(false)).toBe("Nicht erteilt / Not granted");
  });

  it("liefert Einwilligungswerte in der ausgewählten Dokumentensprache", () => {
    expect(consentLabel(true, "de")).toBe("Einverstanden");
    expect(consentLabel(false, "de")).toBe("Nicht erteilt");
    expect(consentLabel(true, "en")).toBe("Consented");
    expect(consentLabel(false, "en")).toBe("Not granted");
  });
});
