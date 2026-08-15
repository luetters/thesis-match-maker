import { describe, expect, it } from "vitest";
import { resolvePreferredLanguage } from "../shared/languagePreference";

describe("resolvePreferredLanguage", () => {
  it("verwendet die gespeicherte Profilpräferenz gegenüber einer lokalen Auswahl", () => {
    expect(resolvePreferredLanguage("de", "en")).toBe("en");
  });

  it("verwendet für nicht angemeldete Personen die lokale Auswahl", () => {
    expect(resolvePreferredLanguage("en", null)).toBe("en");
  });

  it("fällt bei ungültigen Werten sicher auf Deutsch zurück", () => {
    expect(resolvePreferredLanguage("fr", "it")).toBe("de");
  });
});
