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
});
