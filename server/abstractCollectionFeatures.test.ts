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

  it("gibt öffentlich ausschließlich anonymisierte Fachinformationen mit beiden Abstractsprachen und Schlagwörtern zurück", () => {
    const repository = readFileSync(projectFile("server", "db", "abstractCollection.ts"), "utf8");
    const page = readFileSync(projectFile("client", "src", "pages", "AbstractCollection.tsx"), "utf8");
    expect(repository).toContain("submissionSemester: publishedThesisAbstracts.submissionSemester");
    expect(repository).toContain("title: publishedThesisAbstracts.title");
    expect(repository).toContain("department: publishedThesisAbstracts.department");
    expect(repository).toContain("programme: publishedThesisAbstracts.programme");
    expect(repository).toContain("abstractDe: publishedThesisAbstracts.abstractDe");
    expect(repository).toContain("abstractEn: publishedThesisAbstracts.abstractEn");
    expect(repository).toContain("keywords: parseKeywords(entry.keywords)");
    expect(repository).toContain('eq(publishedThesisAbstracts.status, "APPROVED")');
    expect(page).toContain("Abstract Deutsch, Abstract English, Studiengang, Fachbereich, Einreichsemester und Schlagwörter");
  });

  it("stellt die verpflichtete zweisprachige Erfassung erst nach verbindlichem Kolloquium und die administrative Prüfung bereit", () => {
    const panel = readFileSync(projectFile("client", "src", "components", "ColloquiumSchedulingPanel.tsx"), "utf8");
    const moderation = readFileSync(projectFile("client", "src", "components", "AbstractModerationTab.tsx"), "utf8");
    expect(panel).toContain("Verpflichtender Abstract für die öffentliche Abstract-Sammlung");
    expect(panel).toContain("detailData.poll.status === \"CONFIRMED\"");
    expect(panel).toContain("Abstract Deutsch");
    expect(panel).toContain("Abstract English");
    expect(panel).toContain("Semester der Einreichung");
    expect(panel).toContain("mit Tabulator ergänzen");
    expect(panel).toContain("Ich willige ein");
    expect(panel).toContain("Freigabe zurückziehen");
    expect(moderation).toContain("Abstract-Freigaben");
    expect(moderation).toContain("Freigeben");
    expect(moderation).toContain("Nicht freigeben");
  });

  it("erzwingt serverseitig zwei Abstractsprachen und mindestens ein Schlagwort", () => {
    const router = readFileSync(projectFile("server", "routers", "abstractCollectionRouter.ts"), "utf8");
    const repository = readFileSync(projectFile("server", "db", "abstractCollection.ts"), "utf8");
    expect(router).toContain("abstractDe: z.string().trim().min(80).max(3500)");
    expect(router).toContain("abstractEn: z.string().trim().min(80).max(3500)");
    expect(router).toContain("keywords: z.array(z.string().trim().min(2).max(64)).min(1).max(15)");
    expect(repository).toContain("getAbstractSubmissionPrefill");
    expect(repository).toContain("Bitte geben Sie mindestens ein Schlagwort an.");
    expect(repository).toContain("assertConfirmedColloquium");
    expect(repository).toContain('eq(colloquiumSchedulingPolls.status, "CONFIRMED")');
    expect(repository).toContain("Der Abstract kann erst nach verbindlicher Vereinbarung des Kolloquiums eingereicht werden.");
  });

  it("schließt Arbeiten mit aktivem Sperrvermerk serverseitig von Einreichung, Freigabe und öffentlichem Export aus", () => {
    const repository = readFileSync(projectFile("server", "db", "abstractCollection.ts"), "utf8");
    expect(repository).toContain("hasConfidentialityNotice: thesisRequests.hasConfidentialityNotice");
    expect(repository).toContain("Für Arbeiten mit aktivem Sperrvermerk ist keine öffentliche Abstract-Freigabe möglich.");
    expect(repository).toContain('eq(thesisRequests.hasConfidentialityNotice, 0)');
    expect(repository).toContain("innerJoin(thesisRequests, eq(publishedThesisAbstracts.thesisRequestId, thesisRequests.id))");
    expect(repository).toContain("Abstracts mit aktivem Sperrvermerk dürfen nicht veröffentlicht werden.");
  });
});
