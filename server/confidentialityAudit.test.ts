import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Auditierung von Sperrvermerk-Änderungen", () => {
  it("erfasst die Aktivierung bei Antragstellung und Änderungen bei einer Überarbeitung getrennt", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");
    expect(router).toContain('action: "CONFIDENTIALITY_NOTICE_CHANGED"');
    expect(router).toContain('reason: "Sperrvermerk bei Antragstellung aktiviert."');
    expect(router).toContain('previousValue: result.previousValue');
    expect(router).toContain('newValue: result.nextValue');
    expect(db).toContain("confidentialityChanged: previousConfidentiality !== nextConfidentiality");
  });

  it("bietet eine hervorgehobene und gezielt filterbare Audit-Log-Ansicht", () => {
    const admin = readFileSync(projectFile("client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    expect(admin).toContain("Sperrvermerk geändert");
    expect(admin).toContain("CONFIDENTIALITY_NOTICE_CHANGED");
    expect(admin).toContain("bg-amber-50/80");
    expect(admin).toContain("🔒 Sperrvermerk geändert");
  });

  it("erlaubt nachträgliche Änderungen ausschließlich der zuständigen Verwaltung oder Superadmins", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const adminMutation = router.slice(router.indexOf("updateConfidentialityNotice:"), router.indexOf("users: adminProcedure"));
    const studentRevision = router.slice(router.indexOf("reviseSubmission: studentProcedure"), router.indexOf("// --- Examiner"));
    expect(adminMutation).toContain("Nur die zuständige Verwaltung darf einen Sperrvermerk nachträglich ändern.");
    expect(adminMutation).toContain("getAdminDepartment(ctx.user.id)");
    expect(adminMutation).toContain("Sie dürfen den Sperrvermerk nur für Arbeiten Ihres Fachbereichs ändern.");
    expect(studentRevision).not.toContain("hasConfidentialityNotice: z.boolean().optional()");
  });

  it("fordert eine Begründung und speichert sie als Audit-Grund sowie Metadatum", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const admin = readFileSync(projectFile("client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    expect(router).toContain('reason: z.string().trim().min(5, "Bitte begründen Sie die Änderung des Sperrvermerks.").max(1000)');
    expect(router).toContain("reason: input.reason");
    expect(router).toContain("changeReason: input.reason");
    expect(admin).toContain("confidentialityChangeReason");
    expect(admin).toContain("Begründung der Änderung");
    expect(admin).toContain("Änderung mit Begründung speichern");
  });

  it("stellt Sperrvermerk-Ereignisse als amberfarbene Marker in der Fallhistorie dar", () => {
    const examiner = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    expect(examiner).toContain("isConfidentialityEvent");
    expect(examiner).toContain("bg-amber-600");
    expect(examiner).toContain("Sperrvermerk geändert");
    expect(examiner).toContain("Aktiv\" : \"Nicht aktiv\"} →");
  });

  it("zeigt Prüfer:innen eine Dashboardwarnung ausschließlich für eigene betreute Arbeiten", () => {
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    const examiner = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    expect(db).toContain("getConfidentialityChangesForExaminer");
    expect(db).toContain("eq(thesisRequests.examinerId, examinerId)");
    expect(db).toContain("eq(thesisRequests.secondExaminerId, examinerId)");
    expect(router).toContain("confidentialityChangesForExaminer");
    expect(examiner).toContain("Sperrvermerk nachträglich geändert");
    expect(examiner).toContain("confidentialityChangesForExaminer.useQuery()");
  });
});
