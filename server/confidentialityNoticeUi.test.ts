import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Sperrvermerk-Sichtbarkeit", () => {
  it("stellt eine kombinierbare Auswahl und eine Kennzeichnung im Verwaltungsbereich bereit", () => {
    const admin = readFileSync(projectFile("client", "src", "pages", "AdminDashboard.tsx"), "utf8");
    expect(admin).toContain("Alle Sperrvermerke");
    expect(admin).toContain("Mit Sperrvermerk");
    expect(admin).toContain("confidentialityFilter");
    expect(admin).toContain("🔒");
  });

  it("zeigt Erst- und Zweitprüfer:innen ein deutliches vertraulichkeitsbadge", () => {
    const examiner = readFileSync(projectFile("client", "src", "pages", "ExaminerDashboard.tsx"), "utf8");
    expect(examiner).toContain("hasConfidentialityNotice");
    expect(examiner).toContain("bg-amber-100");
    expect(examiner).toContain("Sperrvermerk");
  });
});
