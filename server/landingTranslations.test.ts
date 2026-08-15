import { describe, expect, it } from "vitest";
import { translations } from "../client/src/contexts/LanguageContext";

describe("Landing-Übersetzungen", () => {
  it("stellt alle Hero-Vorschautexte auch auf Englisch bereit", () => {
    expect(translations.en.landing.heroPreview.label).toBe("Theses at a glance");
    expect(translations.en.landing.heroPreview.request).toBe("Matching request");
    expect(translations.en.landing.heroPreview.firstExaminer).toBe("First examiner");
    expect(translations.en.landing.accessibility.contrast).toBe("Contrast");
  });
});
