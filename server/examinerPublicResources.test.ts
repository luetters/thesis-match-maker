import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("öffentliche Prüfer:innenressourcen", () => {
  it("modelliert Template und Empfehlungen getrennt von fallbezogenen Dokumenten", () => {
    const schema = readProjectFile("drizzle/schema.ts");

    expect(schema).toContain('mysqlTable("examiner_public_resources"');
    expect(schema).toContain('["template", "recommendation"]');
    expect(schema).toContain('index("idx_epr_examiner_type")');
  });

  it("erlaubt die Ressourcenverwaltung nur über Prüfer:innenrechte", () => {
    const router = readProjectFile("server/routers.ts");

    expect(router).toContain("myPublicResources: anyExaminerProcedure");
    expect(router).toContain("replacePublicRecommendations: anyExaminerProcedure");
    expect(router).toContain("removePublicTemplate: anyExaminerProcedure");
    expect(router).toContain(".max(12)");
  });

  it("registriert die Ressourcenabfrage tatsächlich im tRPC-Router", () => {
    const procedures = (appRouter as any)._def.procedures as Record<string, unknown>;

    expect(procedures["examiner.myPublicResources"]).toBeDefined();
    expect(procedures["examiner.replacePublicRecommendations"]).toBeDefined();
    expect(procedures["examiner.removePublicTemplate"]).toBeDefined();
  });

  it("begrenzt den Template-Upload auf authentifizierte Prüfer:innen und valide PDFs", () => {
    const uploads = readProjectFile("server/uploadRoutes.ts");

    expect(uploads).toContain('"/api/upload/examiner-template"');
    expect(uploads).toContain("pdfUpload.single(\"template\")");
    expect(uploads).toContain("isPdfBuffer(req.file.buffer)");
    expect(uploads).toContain('role === "examiner" || role === "second_examiner"');
    expect(uploads).toContain("examiner-templates/${user.id}/");
  });

  it("zeigt nur die veröffentlichten Ressourcen im öffentlichen Prüfer:innenprofil", () => {
    const router = readProjectFile("server/routers.ts");
    const publicProfile = readProjectFile("client/src/pages/PublicProfile.tsx");

    expect(router).toContain("resource.isPublished === 1");
    expect(router).toContain("publicTemplate:");
    expect(router).toContain("recommendations:");
    expect(publicProfile).toContain("Thesis-Template & Empfehlungen");
    expect(publicProfile).toContain("recommendations.map");
  });
});
