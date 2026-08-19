import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Fachbereichspflicht für Erstgutachter:innen", () => {
  it("zeigt nach der Rollenwahl eine verpflichtende Fachbereichsauswahl", () => {
    const page = readFileSync(projectFile("client", "src", "pages", "SelectRole.tsx"), "utf8");
    expect(page).toContain('selected === "examiner"');
    expect(page).toContain('id="examiner-department"');
    expect(page).toContain('aria-required="true"');
    expect(page).toContain('option value="FB5"');
  });

  it("validiert die Auswahl zusätzlich serverseitig", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");
    expect(router).toContain('input.requestedRole === "examiner" && !input.department');
    expect(db).toContain('requestedRole === "examiner" && !department');
  });
});
