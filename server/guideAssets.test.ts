import { describe, expect, it } from "vitest";
import { GUIDE_PDF_URLS } from "../client/src/lib/guideAssets";

describe("Rollenbezogene PDF-Leitfäden", () => {
  it("stellt getrennte, dauerhafte PDFs für Erstprüfung, Zweitprüfung und Verwaltung bereit", () => {
    expect(Object.values(GUIDE_PDF_URLS)).toHaveLength(3);
    expect(new Set(Object.values(GUIDE_PDF_URLS)).size).toBe(3);

    for (const url of Object.values(GUIDE_PDF_URLS)) {
      expect(url).toMatch(/^\/manus-storage\/thesis-match-maker-.+\.pdf$/);
    }
  });

  it("bezeichnet die drei Zielgruppen eindeutig", () => {
    expect(GUIDE_PDF_URLS.firstExaminer).toContain("erste-pruefung");
    expect(GUIDE_PDF_URLS.secondExaminer).toContain("zweite-pruefung");
    expect(GUIDE_PDF_URLS.administration).toContain("verwaltung");
  });
});
