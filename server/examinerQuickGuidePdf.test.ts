import { describe, expect, it } from "vitest";
import { buildExaminerQuickGuidePdf } from "./examinerQuickGuidePdf";

describe("Kompaktleitfaden für Prüfer:innen", () => {
  it("erzeugt eine gültige PDF-Datei", async () => {
    const pdf = await buildExaminerQuickGuidePdf();
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
