import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Arbeitsart, Kooperation und Sperrvermerk", () => {
  it("speichert die neuen Projektmerkmale getrennt von Titel und Abstract", () => {
    const schema = readFileSync(projectFile("drizzle", "schema.ts"), "utf8");
    expect(schema).toContain('workType: mysqlEnum("work_type"');
    expect(schema).toContain('workTypeOther: varchar("work_type_other"');
    expect(schema).toContain('isCooperation: tinyint("is_cooperation")');
    expect(schema).toContain('hasConfidentialityNotice: tinyint("has_confidentiality_notice")');
  });

  it("fordert serverseitig Arbeitsart und eine eindeutige Sperrvermerk-Angabe bei Kooperationen", () => {
    const router = readFileSync(projectFile("server", "routers.ts"), "utf8");
    expect(router).toContain('workType: z.enum(["literature_review", "practical_development", "lab_experiment", "empirical_study", "other"])');
    expect(router).toContain('input.workType === "other" && !input.workTypeOther?.trim()');
    expect(router).toContain('input.isCooperation && input.hasConfidentialityNotice === undefined');
    expect(router).toContain('hasConfidentialityNotice: input.isCooperation && input.hasConfidentialityNotice ? 1 : 0');
  });

  it("zeigt die vollständige Auswahl mit bedingtem Sonstiges- und Sperrvermerk-Feld im Thesis-Antrag", () => {
    const dashboard = readFileSync(projectFile("client", "src", "pages", "StudentDashboard.tsx"), "utf8");
    expect(dashboard).toContain('value="literature_review"');
    expect(dashboard).toContain('value="practical_development"');
    expect(dashboard).toContain('value="lab_experiment"');
    expect(dashboard).toContain('value="empirical_study"');
    expect(dashboard).toContain('form.workType === "other"');
    expect(dashboard).toContain('form.isCooperation === "yes"');
    expect(dashboard).toContain('name="confidentiality"');
  });

  it("liefert und zeigt die Merkmale in der Erst- und Zweitprüfer:innenansicht", () => {
    const db = readFileSync(projectFile("server", "db.ts"), "utf8");
    const examinerDashboard = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    expect(db).toContain('workType: thesisRequests.workType');
    expect(db).toContain('hasConfidentialityNotice: thesisRequests.hasConfidentialityNotice');
    expect(db).toContain('eq(thesisRequests.secondExaminerId, examinerId)');
    expect(examinerDashboard).toContain('Art der Arbeit:');
    expect(examinerDashboard).toContain('Kooperation:');
    expect(examinerDashboard).toContain('Sperrvermerk:');
  });
});
