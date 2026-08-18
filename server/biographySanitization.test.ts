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
});
