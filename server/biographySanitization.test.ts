import { describe, expect, it } from "vitest";
import { sanitizeBiographyText } from "./biographySanitization";

describe("sanitizeBiographyText", () => {
  it("entfernt HTML-Markup und potenziell ausführbare Attribute", () => {
    const result = sanitizeBiographyText('<img src=x onerror="alert(1)"><script>alert(2)</script>Forschung & Lehre');
    expect(result).toBe("alert(2)Forschung & Lehre");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("erhält normalen mehrzeiligen Text, entfernt aber Steuerzeichen", () => {
    expect(sanitizeBiographyText("Zeile eins\r\nZeile zwei\u0000")).toBe("Zeile eins\nZeile zwei");
  });

  it("überführt gespeicherte Rich-Text-Biografien lesbar in Klartext", () => {
    const result = sanitizeBiographyText('<p>Ich betreue Arbeiten.</p><p>Anmeldung unter <a href="https://example.org" target="_blank">www.example.org</a><br><br>Beratung auf Deutsch und Englisch.</p>');
    expect(result).toBe("Ich betreue Arbeiten.\n\nAnmeldung unter www.example.org\n\nBeratung auf Deutsch und Englisch.");
    expect(result).not.toContain("href=");
    expect(result).not.toContain("<a");
  });
});
