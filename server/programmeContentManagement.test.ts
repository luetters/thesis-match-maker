import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("Studiengangsseiten und Inhaltsverwaltung", () => {
  it("modelliert öffentliche Inhalte, Links und fachliche Zuständigkeiten getrennt", () => {
    const schema = readProjectFile("drizzle/schema.ts");

    expect(schema).toContain('export const programmeContentManagers = mysqlTable("programme_content_managers"');
    expect(schema).toContain('export const programmePublicLinks = mysqlTable("programme_public_links"');
    expect(schema).toContain('managerType: mysqlEnum("manager_type", ["speaker", "admin"])');
    expect(schema).toContain("logoUrl: varchar(\"logo_url\"");
    expect(schema).toContain("information: text()");
  });

  it("beschränkt Anlage, Verwaltung und Inhalte auf die vorgesehenen Rollen", () => {
    const router = readProjectFile("server/routers.ts");

    expect(router).toContain("createManaged: superadminProcedure");
    expect(router).toContain("updateManaged: superadminProcedure");
    expect(router).toContain("canEditProgrammeContent");
    expect(router).toContain("canAssignProgrammeSpeaker");
    expect(router).toContain('input.managerType === "admin" && ctx.user.role !== "superadmin"');
    expect(router).toContain('target.role === "programme_director"');
  });

  it("stellt nur veröffentlichte Programme öffentlich bereit", () => {
    const router = readProjectFile("server/routers.ts");
    const db = readProjectFile("server/db.ts");
    const directory = readProjectFile("client/src/pages/ProgrammeDirectory.tsx");
    const page = readProjectFile("client/src/pages/ProgrammePage.tsx");

    expect(db).toContain("eq(programmes.isPublished, 1)");
    expect(router).toContain("publicList: publicProcedure");
    expect(router).toContain("publicPage: publicProcedure");
    expect(directory).toContain("trpc.programmes.publicList.useQuery");
    expect(page).toContain("trpc.programmes.publicPage.useQuery");
    expect(page).not.toContain("mailto:");
  });

  it("akzeptiert Studiengangslogos ausschließlich als sichere Bilddateien durch Superadmins", () => {
    const uploads = readProjectFile("server/uploadRoutes.ts");

    expect(uploads).toContain('"/api/upload/programme-logo/:programmeId"');
    expect(uploads).toContain('user.role !== "superadmin"');
    expect(uploads).toContain('"image/jpeg", "image/png", "image/webp"');
    expect(uploads).toContain("hasExpectedFileSignature(req.file)");
    expect(uploads).toContain("programme-logos/${programmeId}/");
  });
});
