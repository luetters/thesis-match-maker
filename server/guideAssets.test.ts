import { describe, expect, it } from "vitest";
import { GUIDE_PDF_URLS, getDashboardGuideAudience, getExaminerGuide } from "../shared/guideAssets";

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
});
