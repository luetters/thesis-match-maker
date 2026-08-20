import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("formale Marken- und Sicherheitsangaben in E-Mails", () => {
  it("verwendet eine fachbereichsunabhängige Wortmarke in den gemeinsamen E-Mail-Kopfzeilen", () => {
    const templates = readFileSync(projectFile("server", "emailTemplates.ts"), "utf8");
    expect(templates).toContain("Thesis Match Maker");
    expect(templates).toContain("Organisation von Abschlussarbeiten");
    expect(templates).not.toContain("Fachbereich 3");
    expect(templates).not.toContain("ThesisMatchMaker_b92cd3c0.jpg");
  });

  it("enthält Impressum und den klaren Sicherheitshinweis in deutsch und englisch", () => {
    const templates = readFileSync(projectFile("server", "emailTemplates.ts"), "utf8");
    expect(templates).toContain("/impressum");
    expect(templates).toContain("Dies ist kein offizielles Tool der HTW Berlin");
    expect(templates).toContain("Nutzen Sie niemals Ihr echtes HTW-Berlin-Passwort");
    expect(templates).toContain("This is not an official HTW Berlin tool");
    expect(templates).toContain("Never use your actual HTW Berlin password");
  });

  it("führt in der Registrierungsbenachrichtigung Fachbereich und Berliner Anmeldezeit sicher auf", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    expect(router).toContain('timeZone: "Europe/Berlin"');
    expect(router).toContain("Registriert am");
    expect(router).toContain("Fachbereich");
    expect(router).toContain("input.department ?? \"Nicht angegeben\"");
    expect(router).toContain("escapeEmailHtml(input.name)");
    expect(router).not.toContain("HTW Berlin &ndash; Fachbereich 3");
    expect(router).not.toContain("ThesisMatchMaker_e15e6348.jpg");
  });
});
