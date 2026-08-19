import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Dashboard-Modulgrenzen", () => {
  it("bindet Anfragen und Berichte des Prüfer:innen-Dashboards über eigene Fachmodule ein", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    expect(dashboard).toContain('from "@/components/examiner/ExaminerWorkspaceSections"');
    expect(dashboard).toContain("<ExaminerRequestsSection>");
    expect(dashboard).toContain("<ExaminerReportsSection>");
  });

  it("bindet Audit und Nutzerverwaltung über eigene Verwaltungsmodulgrenzen ein", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    expect(dashboard).toContain('from "@/components/admin/AdminWorkspaceSections"');
    expect(dashboard).toContain("<AdminAuditSection>");
    expect(dashboard).toContain("<AdminUserManagementSection>");
  });
});
