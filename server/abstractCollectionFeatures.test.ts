import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("einwilligungsbasierte Abstract-Sammlung", () => {
  it("speichert die öffentliche Sammlung mit Einwilligung und getrenntem Freigabestatus", () => {
    const schema = readFileSync(projectFile("drizzle", "schema.ts"), "utf8");
    expect(schema).toContain('mysqlTable("published_thesis_abstracts"');
    expect(schema).toContain('publicationConsent: tinyint("publication_consent")');
    expect(schema).toContain('status: mysqlEnum(["PENDING_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"])');
    expect(schema).toContain('uniqueIndex("uq_published_abstract_thesis")');
  });

  it("verlangt eine explizite Zustimmung und bindet die Einreichung an die eigene Thesis", () => {
    const router = readFileSync(projectFile("server", "routers", "abstractCollectionRouter.ts"), "utf8");
    const repository = readFileSync(projectFile("server", "db", "abstractCollection.ts"), "utf8");
    expect(router).toContain("publicationConsent: z.literal(true)");
    expect(router).toContain('ctx.user.role !== "student"');
    expect(router).toContain('["admin", "superadmin"].includes(ctx.user.role)');
    expect(repository).toContain("eq(thesisRequests.studentId, input.studentId)");
    expect(repository).toContain('status: "PENDING_REVIEW"');
    expect(repository).toContain('status: "WITHDRAWN"');
  });

  it("gibt öffentlich ausschließlich Semester, Titel, Fachbereich und Abstract zurück", () => {
    const repository = readFileSync(projectFile("server", "db", "abstractCollection.ts"), "utf8");
    const page = readFileSync(projectFile("client", "src", "pages", "AbstractCollection.tsx"), "utf8");
    expect(repository).toContain("submissionSemester: publishedThesisAbstracts.submissionSemester");
    expect(repository).toContain("title: publishedThesisAbstracts.title");
    expect(repository).toContain("department: publishedThesisAbstracts.department");
    expect(repository).toContain("abstract: publishedThesisAbstracts.abstract");
    expect(repository).toContain('eq(publishedThesisAbstracts.status, "APPROVED")');
    expect(page).toContain("Die Sammlung zeigt ausschließlich Semester, Titel, Fachbereich und den redaktionell geprüften Abstract.");
  });

  it("stellt die Zustimmung im Kolloquiumsprozess und die administrative Prüfung bereit", () => {
    const panel = readFileSync(projectFile("client", "src", "components", "ColloquiumSchedulingPanel.tsx"), "utf8");
    const moderation = readFileSync(projectFile("client", "src", "components", "AbstractModerationTab.tsx"), "utf8");
    expect(panel).toContain("Abstract für die Abstract-Sammlung");
    expect(panel).toContain("Ich willige ein");
    expect(panel).toContain("Freigabe zurückziehen");
    expect(moderation).toContain("Abstract-Freigaben");
    expect(moderation).toContain("Freigeben");
    expect(moderation).toContain("Nicht freigeben");
  });
});
