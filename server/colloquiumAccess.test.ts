import { describe, expect, it } from "vitest";
import { hasColloquiumThesisAccess } from "./routers";

const thesis = { studentId: 10, examinerId: 20, secondExaminerId: 30 };

describe("Kolloquiums-Fallzugriff", () => {
  it("erlaubt den Abruf ausschließlich beteiligten Personen", () => {
    expect(hasColloquiumThesisAccess({ id: 10, role: "student" }, thesis)).toBe(true);
    expect(hasColloquiumThesisAccess({ id: 20, role: "examiner" }, thesis)).toBe(true);
    expect(hasColloquiumThesisAccess({ id: 30, role: "second_examiner" }, thesis)).toBe(true);
    expect(hasColloquiumThesisAccess({ id: 99, role: "student" }, thesis)).toBe(false);
    expect(hasColloquiumThesisAccess({ id: 99, role: "examiner" }, thesis)).toBe(false);
  });

  it("erlaubt ausdrücklich berechtigten Verwaltungsrollen den Abruf", () => {
    expect(hasColloquiumThesisAccess({ id: 40, role: "admin" }, thesis)).toBe(true);
    expect(hasColloquiumThesisAccess({ id: 41, role: "superadmin" }, thesis)).toBe(true);
    expect(hasColloquiumThesisAccess({ id: 42, role: "student" }, thesis, ["pav"])).toBe(true);
  });
});
