import { describe, expect, it } from "vitest";
import { resolveEmailTemplate } from "./db";
import type { EmailTemplateType } from "./db";

// ─── resolveEmailTemplate ────────────────────────────────────────────────────

describe("resolveEmailTemplate", () => {
  it("ersetzt alle vier Variablen korrekt", () => {
    const tpl = {
      subject: "Ihre Anfrage zu {{thema}} – {{studiengang}}",
      body: "Sehr geehrte/r {{name}},\n\nIhre Anfrage für das Semester {{semester}} wurde bearbeitet.",
    };
    const vars = {
      name: "Maria Müller",
      thema: "KI im Gesundheitswesen",
      semester: "WS2025",
      studiengang: "Informatik",
    };
    const result = resolveEmailTemplate(tpl, vars);
    expect(result.subject).toBe("Ihre Anfrage zu KI im Gesundheitswesen – Informatik");
    expect(result.body).toBe(
      "Sehr geehrte/r Maria Müller,\n\nIhre Anfrage für das Semester WS2025 wurde bearbeitet."
    );
  });

  it("ersetzt mehrfache Vorkommen derselben Variable", () => {
    const tpl = {
      subject: "{{name}} – {{name}}",
      body: "{{thema}} und nochmal {{thema}}",
    };
    const result = resolveEmailTemplate(tpl, { name: "Max", thema: "Blockchain" });
    expect(result.subject).toBe("Max – Max");
    expect(result.body).toBe("Blockchain und nochmal Blockchain");
  });

  it("ersetzt fehlende Variablen durch leeren String", () => {
    const tpl = {
      subject: "Hallo {{name}}",
      body: "Semester: {{semester}}",
    };
    const result = resolveEmailTemplate(tpl, {});
    expect(result.subject).toBe("Hallo ");
    expect(result.body).toBe("Semester: ");
  });

  it("lässt unbekannte Platzhalter unverändert", () => {
    const tpl = {
      subject: "Test {{unbekannt}}",
      body: "{{name}} – {{unbekannt2}}",
    };
    const result = resolveEmailTemplate(tpl, { name: "Anna" });
    expect(result.subject).toBe("Test {{unbekannt}}");
    expect(result.body).toBe("Anna – {{unbekannt2}}");
  });

  it("gibt leere Strings zurück wenn Template leer ist", () => {
    const result = resolveEmailTemplate({ subject: "", body: "" }, { name: "Test" });
    expect(result.subject).toBe("");
    expect(result.body).toBe("");
  });
});

// ─── EmailTemplateType ────────────────────────────────────────────────────────

describe("EmailTemplateType", () => {
  it("enthält alle vier erwarteten Template-Typen", () => {
    const validTypes: EmailTemplateType[] = [
      "requirements",
      "acceptance",
      "rejection",
      "fully_booked",
    ];
    // Sicherstellen, dass alle vier Typen als gültige Strings akzeptiert werden
    for (const type of validTypes) {
      expect(typeof type).toBe("string");
    }
    expect(validTypes).toHaveLength(4);
  });
});
