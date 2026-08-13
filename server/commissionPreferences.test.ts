import { describe, expect, it } from "vitest";
import { appendCommissionPreference } from "../client/src/lib/commissionPreferences";

describe("appendCommissionPreference", () => {
  it("fügt eine neue Zweitprüfer:innen-ID hinzu und bewahrt bestehende Präferenzen", () => {
    expect(appendCommissionPreference([11, 24], 42)).toEqual([11, 24, 42]);
  });

  it("verhindert doppelte Einträge", () => {
    expect(appendCommissionPreference([11, 24], 24)).toEqual([11, 24]);
  });
});
