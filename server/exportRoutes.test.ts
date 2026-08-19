import { describe, expect, it } from "vitest";
import { filterExaminerReportCases, registerExportRoutes } from "./exportRoutes";

describe("PDF-Exportrouten", () => {
  it("registriert einen eigenen Export der vollständigen Fallhistorie", () => {
    const paths: string[] = [];
    const app = {
      get(path: string) {
        paths.push(path);
      },
    };
    registerExportRoutes(app as any);
    expect(paths).toContain("/api/export/thesis/:id/history.pdf");
  });

  it("registriert private Notizexporte als CSV und PDF", () => {
    const paths: string[] = [];
    const app = { get(path: string) { paths.push(path); } };
    registerExportRoutes(app as any);
    expect(paths).toContain("/api/export/my-notes.csv");
    expect(paths).toContain("/api/export/my-notes.pdf");
  });

  it("registriert den geschützten PDF-Export des Bereitstellungsleitfadens", () => {
    const paths: string[] = [];
    const app = { get(path: string) { paths.push(path); } };
    registerExportRoutes(app as any);
    expect(paths).toContain("/api/export/hosting-deployment-guide.pdf");
  });

  it("registriert den öffentlichen kompakten Prüfer:innenleitfaden", () => {
    const paths: string[] = [];
    const app = { get(path: string) { paths.push(path); } };
    registerExportRoutes(app as any);
    expect(paths).toContain("/api/export/examiner-quick-guide.pdf");
  });

  it("registriert geschützte PDF- und CSV-Berichte für eigene Betreuungsfälle", () => {
    const paths: string[] = [];
    const app = { get(path: string) { paths.push(path); } };
    registerExportRoutes(app as any);
    expect(paths).toContain("/api/export/my-students-report.pdf");
    expect(paths).toContain("/api/export/my-students-report.csv");
  });

  it("filtert und sortiert Berichtsfälle identisch für Vorschau und Export", () => {
    const cases = [
      { id: 1, targetSemester: "WS 2026/27", status: "IN_PROGRESS", submissionDeadline: new Date("2026-12-15") },
      { id: 2, targetSemester: "WS 2026/27", status: "WITHDRAWN", submissionDeadline: new Date("2026-10-01") },
      { id: 3, targetSemester: "SS 2026", status: "IN_PROGRESS", submissionDeadline: new Date("2026-08-01") },
      { id: 4, targetSemester: "WS 2026/27", status: "IN_PROGRESS", submissionDeadline: new Date("2026-09-01") },
    ];
    const result = filterExaminerReportCases(cases, { semester: "WS 2026/27", activeOnly: true, deadlineSort: "asc" });
    expect(result.map((entry) => entry.id)).toEqual([4, 1]);
  });
});
