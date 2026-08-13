import { describe, expect, it } from "vitest";
import { getVerificationTextLayout, hasEmbeddedHtwPdfLogo } from "./thesisPdf";

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
});
