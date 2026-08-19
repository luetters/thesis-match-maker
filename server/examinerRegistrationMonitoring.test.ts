import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Kennzeichnung und Monitoring neuer Prüfer:innenanmeldungen", () => {
  it("kennzeichnet externe Zweitgutachter:innen im Passwort-Registrierungsformular eindeutig", () => {
    const login = readFileSync(projectFile("client", "src", "pages", "Login.tsx"), "utf8");
    expect(login).toContain('id: "second_examiner"');
    expect(login).toContain('selectedRole === "second_examiner"');
    expect(login).toContain("Externe Zweitgutachter:in");
    expect(login).toContain("regExaminerDepartment");
  });

  it("zeigt fachbereichslose Altfälle und die Fachbereichsauswertung ausschließlich im Superadmin-Bereich", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "SuperadminDashboard.tsx"), "utf8");
    expect(dashboard).toContain("getExaminerRegistrationMonitoring");
    expect(dashboard).toContain("Unvollständige Altfälle bei Erstprüfer:innen");
    expect(dashboard).toContain("Neue Prüfer:innenanmeldungen nach Fachbereich");
    expect(dashboard).toContain("externalSecondExaminerCount");
  });
});
