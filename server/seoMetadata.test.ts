import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("öffentliche Metadaten und Indexierungsgrenzen", () => {
  it("definiert eindeutige Metadaten für die öffentlichen Kernseiten", () => {
    const component = readFileSync(projectFile("client", "src", "components", "SeoMetadata.tsx"), "utf8");
    expect(component).toContain('"/faq"');
    expect(component).toContain('"/studiengaenge"');
    expect(component).toContain('"/abschlussarbeiten"');
    expect(component).toContain("Anonymisierte, freigegebene Abschlussarbeitsabstracts");
  });

  it("hält private Bereiche von der Indexierung fern und setzt Canonical-URLs nur auf der Produktionsdomain", () => {
    const component = readFileSync(projectFile("client", "src", "components", "SeoMetadata.tsx"), "utf8");
    expect(component).toContain('"noindex,nofollow,noarchive"');
    expect(component).toContain('window.location.hostname === "thesismatch.online"');
    expect(component).toContain("https://thesismatch.online");
    expect(component).toContain('"@type": "EducationalOrganization"');
    expect(component).toContain('upsertProperty("og:title", definition.title)');
    expect(component).toContain('upsertProperty("og:url", publicUrl)');
    expect(component).toContain('upsertMeta("twitter:card", "summary")');
  });

  it("zeichnet veröffentlichte Studiengangsdetailseiten nur mit ihren sichtbaren Programminformationen aus", () => {
    const page = readFileSync(projectFile("client", "src", "pages", "ProgrammePage.tsx"), "utf8");
    expect(page).toContain("EducationalOccupationalProgram");
    expect(page).toContain("programme.information");
    expect(page).toContain("document.title");
    expect(page).not.toContain("speaker.email");
  });
});
