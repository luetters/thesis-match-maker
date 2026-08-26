import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("Superadmin-Löschverwaltung", () => {
  const db = readProjectFile("server/db.ts");
  const router = readProjectFile("server/routers.ts");

  it("beschränkt Vorschau und Endlöschung auf den Superadmin-Router", () => {
    expect(router).toContain("deletionPreview: superadminProcedure");
    expect(router).toContain("permanentlyDeleteThesisData: superadminProcedure");
  });

  it("fordert zwei unabhängige Bestätigungen und eine begründete Endlöschung", () => {
    expect(router).toContain('confirmation: z.literal("ENDGUELTIG LOESCHEN")');
    expect(router).toContain("secondConfirmation: z.literal(true)");
    expect(router).toContain("reason: z.string().trim().min(10).max(1000)");
  });

  it("prüft die Vorschau unmittelbar vor der Löschung erneut und erlaubt keinen automatischen Dreijahreslauf", () => {
    expect(db).toContain("const freshPreview = await getThesisDeletionPreview");
    expect(db).toContain("Die Löschvorschau ist nicht mehr aktuell oder enthält unzulässige Fälle");
    expect(db).toContain("caseClosedAt");
    expect(db).toContain("threeYearsAgoIsoDate");
  });

  it("entfernt die fallbezogenen Datensätze transaktional und protokolliert nur datensparsame Löschmetadaten", () => {
    expect(db).toContain("await db.transaction(async (tx)");
    for (const table of [
      "conditional_documents",
      "colloquium_scheduling_polls",
      "examiner_action_tokens",
      "thesis_doc_tokens",
      "published_thesis_abstracts",
    ]) {
      expect(db).toContain(`DELETE FROM ${table}`);
    }
    expect(db).toContain("tx.delete(thesisRequests)");
    expect(db).toContain('action: "THESIS_DATA_DELETED"');
    expect(db).toContain("metadata: { scope: input.scope, deletedCount: ids.length }");
  });
});
