import { describe, expect, it } from "vitest";
import { fillEmailTemplatePreview } from "../shared/emailTemplatePreview";

describe("E-Mail-Vorschau", () => {
  it("ersetzt Platzhalter mit deutschen Beispieldaten", () => {
    expect(fillEmailTemplatePreview("Hallo {{studentName}}, {{thesisTitle}}", "de")).toBe("Hallo Mara Muster, Digitale Transformation in der Hochschullehre");
  });

  it("ersetzt Platzhalter mit englischen Beispieldaten", () => {
    expect(fillEmailTemplatePreview("Hello {{studentName}}, {{newStatus}}", "en")).toBe("Hello Mara Example, In progress");
  });
});
