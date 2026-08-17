import { describe, expect, it } from "vitest";
import { getThesisHistoryPdfCopy } from "../shared/thesisHistoryPdfLocale";

describe("Lokalisierung der Prüfungsakten-PDF", () => {
  it("liefert englische Überschriften und Zeitformate", () => {
    const copy = getThesisHistoryPdfCopy("en");
    expect(copy.heading).toBe("Case history for examination record");
    expect(copy.locale).toBe("en-GB");
    expect(copy.subtitle(42, new Date("2026-10-15T00:00:00Z"))).toContain("Request #42");
  });

  it("liefert deutsche Überschriften und Zeitformate", () => {
    const copy = getThesisHistoryPdfCopy("de");
    expect(copy.heading).toBe("Fallhistorie für Prüfungsakte");
    expect(copy.locale).toBe("de-DE");
    expect(copy.subtitle(42, new Date("2026-10-15T00:00:00Z"))).toContain("Antrag #42");
  });
});
