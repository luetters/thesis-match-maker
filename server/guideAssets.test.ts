import { describe, expect, it } from "vitest";
import { getGuideDownloadSessionKey, GUIDE_DOWNLOAD_KEYS, GUIDE_PDF_URLS, GUIDE_PRINT_PDF_URLS, getDashboardGuideAudience, getExaminerGuide, isGuideDownloadKey } from "../shared/guideAssets";

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

  it("stellt zu jedem Leitfaden eine getrennte druckoptimierte Schwarzweißfassung bereit", () => {
    expect(Object.values(GUIDE_PRINT_PDF_URLS)).toHaveLength(3);
    expect(new Set(Object.values(GUIDE_PRINT_PDF_URLS)).size).toBe(3);
    expect(GUIDE_PRINT_PDF_URLS.firstExaminer).toContain("erste-pruefung-leitfaden-druckversion");
    expect(GUIDE_PRINT_PDF_URLS.secondExaminer).toContain("zweite-pruefung-leitfaden-druckversion");
    expect(GUIDE_PRINT_PDF_URLS.administration).toContain("verwaltung-leitfaden-druckversion");
  });

  it("liefert für Erst- und Zweitprüfung jeweils nur den passenden Leitfaden", () => {
    expect(getExaminerGuide("examiner")).toMatchObject({
      url: GUIDE_PDF_URLS.firstExaminer,
      deLabel: "Leitfaden für die Erstprüfung",
    });
    expect(getExaminerGuide("second_examiner")).toMatchObject({
      url: GUIDE_PDF_URLS.secondExaminer,
      enLabel: "Second examiner guide",
    });
    expect(getExaminerGuide()).toBeNull();
  });

  it("priorisiert den aktiven Rollenmodus für den Dashboard-Hinweis", () => {
    expect(getDashboardGuideAudience("admin", ["examiner", "admin"])).toBe("administration");
    expect(getDashboardGuideAudience("examiner", ["examiner", "second_examiner", "admin"])).toBe("firstExaminer");
    expect(getDashboardGuideAudience("second_examiner", ["examiner", "second_examiner"])).toBe("secondExaminer");
    expect(getDashboardGuideAudience("student", ["student"])).toBeNull();
  });

  it("definiert ausschließlich drei nicht personenbezogene Downloadschlüssel", () => {
    expect(GUIDE_DOWNLOAD_KEYS).toEqual(["first_examiner", "second_examiner", "administration"]);
    expect(isGuideDownloadKey("first_examiner")).toBe(true);
    expect(isGuideDownloadKey("unknown")).toBe(false);
    expect(getGuideDownloadSessionKey("administration")).toBe("thesis-match-guide-download:administration");
    expect(getGuideDownloadSessionKey("administration")).not.toMatch(/user|email|ip|device/i);
  });
});
