import { describe, expect, it } from "vitest";
import { hasExaminerProfileCapabilities } from "../shared/profileCapabilities";

describe("Prüfer:innenfunktionen im Profil", () => {
  it("sind für Erst- und Zweitprüfer:innen verfügbar", () => {
    expect(hasExaminerProfileCapabilities("examiner")).toBe(true);
    expect(hasExaminerProfileCapabilities("second_examiner")).toBe(true);
  });

  it("sind für reine Verwaltungs- und Superadminrollen gesperrt", () => {
    expect(hasExaminerProfileCapabilities("admin")).toBe(false);
    expect(hasExaminerProfileCapabilities("superadmin")).toBe(false);
  });
});
