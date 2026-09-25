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

  it("verlinkt die Datenübernahme für Superadmins sichtbar aus der Verwaltungsnavigation", () => {
    const adminDashboard = readFileSync(projectFile("client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    const superadminDashboard = readFileSync(projectFile("client", "src", "pages", "SuperadminDashboard.tsx"), "utf8");

    expect(adminDashboard).toContain('href: "/superadmin/portable-transfer", label: "Datenübernahme"');
    expect(adminDashboard).toContain("...(isSuperadmin ?");
    expect(superadminDashboard).toContain('location === "/superadmin/portable-transfer" ? "portable_transfer" : "stats"');
    expect(superadminDashboard).toContain('location === "/superadmin/portable-transfer") setActiveTab("portable_transfer")');
  });
});


describe("Gemeldete Prüfer:innen- und Profilregressionen", () => {
  it("zeigt ausstehende Zusagen als rotes Badge im linken Menü an", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    const layout = readFileSync(projectFile("client", "src", "components", "ThesisDashboardLayout.tsx"), "utf8");
    expect(dashboard).toContain("pendingRequestsCount");
    expect(dashboard).toContain('item.href === "/examiner/requests"');
    expect(layout).toContain("bg-red-500");
  });

  it("verknüpft das Exposé mit der Backend-Spalte exposeUrl und den Kommissionsdokumenten", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");
    expect(dashboard).toContain("req.exposeUrl");
    expect(dashboard).toContain("isAssignedExaminer && hasCompleteCommission");
    expect(db).toContain("exposeUrl: thesisRequests.exposeUrl");
  });

  it("verdrahtet Profilfelder mit feldweisem OnBlur-Autosave", () => {
    const profile = readFileSync(projectFile("client", "src", "pages", "Profile.tsx"), "utf8");
    expect(profile).toContain("const autoSaveField");
    expect(profile).toContain("onBlur={() => autoSaveField");
  });
});
