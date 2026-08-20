import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Freigabeliste: Altfälle und Suche", () => {
  it("stellt eine abgesicherte Nachpflege des Fachbereichs für ausstehende Erstprüfer:innen bereit", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");

    expect(router).toContain("assignPendingExaminerDepartment: protectedProcedure");
    expect(router).toContain("Sie dürfen nur Ihren eigenen Fachbereich zuordnen.");
    expect(db).toContain("export async function assignPendingExaminerDepartment");
    expect(db).toContain("PENDING_EXAMINER_DEPARTMENT_ASSIGNED");
  });

  it("verbindet die Freigabeliste mit Zuordnungsaktion und Suche nach Name oder E-Mail", () => {
    const component = readFileSync(projectFile("client", "src", "components", "RoleApprovalTab.tsx"), "utf8");

    expect(component).toContain("assignPendingExaminerDepartment.useMutation");
    expect(component).toContain("Eigenen Fachbereich übernehmen");
    expect(component).toContain("Nach Name oder E-Mail suchen");
    expect(component).toContain("Keine passenden Registrierungen");
  });

  it("unterstützt kombinierbare Rollen- und Fachbereichsfilter sowie die Datumssortierung", () => {
    const component = readFileSync(projectFile("client", "src", "components", "RoleApprovalTab.tsx"), "utf8");

    expect(component).toContain("Freigaben filtern und sortieren");
    expect(component).toContain("roleFilter");
    expect(component).toContain("departmentFilter");
    expect(component).toContain("sortOrder");
    expect(component).toContain("Neueste zuerst");
    expect(component).toContain("Älteste zuerst");
    expect(component).toContain("Nicht zugeordnet");
  });

  it("kennzeichnet über eine Woche offene Anträge und zeigt eine datensparsame Prüfer:innenvorschau", () => {
    const component = readFileSync(projectFile("client", "src", "components", "RoleApprovalTab.tsx"), "utf8");

    expect(component).toContain("WEEK_IN_MS");
    expect(component).toContain("Seit {openDays} Tagen offen");
    expect(component).toContain("Profilvorschau für die Freigabe");
    expect(component).toContain("Extern · keine interne Fachbereichszuordnung");
    expect(component).toContain("Weitere Profilangaben werden erst nach der regulären Berechtigungsprüfung");
  });
});
