import { describe, expect, it } from "vitest";
import { buildHostingDeploymentGuidePdf } from "./hostingGuidePdf";

describe("Bereitstellungsleitfaden als PDF", () => {
  it("erzeugt ein nicht leeres PDF-Dokument", async () => {
    const pdf = await buildHostingDeploymentGuidePdf();
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
