import { describe, expect, it } from "vitest";
import { canManageDepartment, isAdminDepartment } from "./adminDepartmentScope";

describe("Fachbereichsrechte der Verwaltung", () => {
  it("erkennt ausschließlich die fünf zulässigen Fachbereiche", () => {
    expect(isAdminDepartment("FB1")).toBe(true);
    expect(isAdminDepartment("FB5")).toBe(true);
    expect(isAdminDepartment("FB6")).toBe(false);
  });

  it("erlaubt Verwaltungsvorgänge nur im zugewiesenen Fachbereich", () => {
    expect(canManageDepartment("FB3", "FB3")).toBe(true);
    expect(canManageDepartment("FB3", "FB2")).toBe(false);
    expect(canManageDepartment("FB3", null)).toBe(false);
    expect(canManageDepartment(null, "FB3")).toBe(false);
  });
});
