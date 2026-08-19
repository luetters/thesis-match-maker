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

  it("erfasst akademische Titel bereits bei der Passwort-Registrierung und übergibt sie serverseitig", () => {
    const login = readFileSync(projectFile("client", "src", "pages", "Login.tsx"), "utf8");
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    expect(login).toContain('id="academic-title"');
    expect(login).toContain('option value="Prof. Dr."');
    expect(login).toContain('academicTitle: regAcademicTitle || undefined');
    expect(router).toContain('academicTitle: z.string().trim().max(64).optional()');
    expect(router).toContain('input.academicTitle');
  });

  it("weist Freigabekarten eindeutig mit E-Mail und Fachbereich aus", () => {
    const approvalTab = readFileSync(projectFile("client", "src", "components", "RoleApprovalTab.tsx"), "utf8");
    expect(approvalTab).toContain("E-Mail:");
    expect(approvalTab).toContain("Fachbereich nicht angegeben");
    expect(approvalTab).toContain('user.requestedRole === "examiner" && Boolean(user.department)');
  });
});
