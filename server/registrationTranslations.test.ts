import { describe, expect, it } from "vitest";
import { translations } from "../client/src/contexts/LanguageContext";

describe("Registrierungsübersetzungen", () => {
  it("stellt die sichtbaren englischen Texte für Einstieg und Kontoerstellung bereit", () => {
    const login = translations.en.login;

    expect(login.firstTimeTitle).toBe("First time here?");
    expect(login.registeredBadge).toBe("Already registered");
    expect(login.samlSignInTitle).toBe("Sign in with HTW Berlin Web Login");
    expect(login.createAccountCardDescription).toContain("Register now");
    expect(login.optionalConsentsTitle).toBe("Optional consents");
    expect(login.departmentNames.FB3).toContain("Department 3");
  });

  it("hält die deutschen und englischen Registrierungsschlüssel deckungsgleich", () => {
    const requiredKeys = [
      "firstTimeTitle",
      "signInCardDescription",
      "samlSignInDescription",
      "optionalConsentsDescription",
      "plagiarismConsent",
      "aiReviewConsent",
      "selectProgrammeRequired",
    ] as const;

    for (const key of requiredKeys) {
      expect(translations.de.login[key]).toBeTruthy();
      expect(translations.en.login[key]).toBeTruthy();
    }
  });
});
