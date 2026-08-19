import { describe, expect, it } from "vitest";
import { registerExportRoutes } from "./exportRoutes";

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
});
