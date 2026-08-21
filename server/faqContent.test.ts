import { describe, expect, it } from "vitest";
import { FAQ_DE, FAQ_EN, FAQ_GUIDE_DOWNLOAD_KEYS, FAQ_GUIDE_LINKS } from "../client/src/pages/Faq";
import { GUIDE_PDF_URLS } from "../shared/guideAssets";

describe("FAQ-Inhalte", () => {
  it("deckt alle vorgesehenen Zielgruppen auf Deutsch ab", () => {
    expect(FAQ_DE.general.length).toBeGreaterThanOrEqual(6);
    expect(FAQ_DE.student.length).toBeGreaterThanOrEqual(3);
    expect(FAQ_DE.firstExaminer.length).toBeGreaterThanOrEqual(3);
    expect(FAQ_DE.secondExaminer.length).toBeGreaterThanOrEqual(3);
    expect(FAQ_DE.admin.length).toBeGreaterThanOrEqual(3);
  });

  it("enthält Akzeptanz-, Datenschutz- und Passwortinformationen in beiden Sprachen", () => {
    const german = FAQ_DE.general.map((item) => `${item.question} ${item.answer}`).join(" ");
    const english = FAQ_EN.general.map((item) => `${item.question} ${item.answer}`).join(" ");
    expect(german).toContain("freiwillig");
    expect(german).toContain("Passwort");
    expect(english).toContain("voluntary");
    expect(english).toContain("password");
  });

  it("stellt alle drei rollenbezogenen PDF-Leitfäden in der FAQ bereit", () => {
    expect(FAQ_GUIDE_LINKS).toEqual([
      GUIDE_PDF_URLS.firstExaminer,
      GUIDE_PDF_URLS.secondExaminer,
      GUIDE_PDF_URLS.administration,
    ]);
    expect(FAQ_GUIDE_DOWNLOAD_KEYS).toEqual(["first_examiner", "second_examiner", "administration"]);
  });
});
