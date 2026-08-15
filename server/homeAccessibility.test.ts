import { describe, expect, it } from "vitest";
import { getHighContrastPreference, toggleHighContrastPreference } from "../shared/homeAccessibility";

describe("Hochkontrastmodus der Startseite", () => {
  it("wertet ausschließlich eine explizit gespeicherte Auswahl als aktiv", () => {
    expect(getHighContrastPreference("true")).toBe(true);
    expect(getHighContrastPreference("false")).toBe(false);
    expect(getHighContrastPreference(null)).toBe(false);
  });

  it("wechselt den gespeicherten Kontrastmodus eindeutig", () => {
    expect(toggleHighContrastPreference(false)).toBe(true);
    expect(toggleHighContrastPreference(true)).toBe(false);
  });
});
