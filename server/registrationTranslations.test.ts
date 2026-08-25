import { describe, expect, it } from "vitest";
import { translations } from "../client/src/contexts/LanguageContext";

describe("Registrierungs- und Antragsübersetzungen", () => {
  it("stellt die sichtbaren englischen Texte für Einstieg und Kontoerstellung bereit", () => {
    const login = translations.en.login;

    expect(login.firstTimeTitle).toBe("First time here?");
    expect(login.registeredBadge).toBe("Already registered");
    expect(login.samlSignInTitle).toBe("Sign in with HTW Berlin Web Login");
    expect(login.createAccountCardDescription).toContain("Register now");
    expect(login.departmentNames.FB3).toContain("Department 3");
  });

  it("hält die deutschen und englischen Registrierungsschlüssel deckungsgleich", () => {
    const requiredKeys = [
      "firstTimeTitle",
      "signInCardDescription",
      "samlSignInDescription",
      "selectProgrammeRequired",
    ] as const;

    for (const key of requiredKeys) {
      expect(translations.de.login[key]).toBeTruthy();
      expect(translations.en.login[key]).toBeTruthy();
    }
  });

  it("stellt die freiwilligen Einwilligungen nur im Thesis-Antrag zweisprachig bereit", () => {
    const requiredStudentKeys = [
      "reviewConsentsTitle",
      "reviewConsentsDescription",
      "plagiarismConsentLabel",
      "aiReviewConsentLabel",
    ] as const;

    for (const key of requiredStudentKeys) {
      expect(translations.de.student[key]).toBeTruthy();
      expect(translations.en.student[key]).toBeTruthy();
    }
  });
});
