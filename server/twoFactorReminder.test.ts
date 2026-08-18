import { describe, expect, it } from "vitest";
import { isTwoFactorRequirementOverdue, parseRequiredTwoFactorRoles } from "./twoFactorReminder";

describe("2FA-Erinnerungsregeln", () => {
  it("ermittelt ausschließlich gültige Rollen aus der Konfiguration", () => {
    expect(parseRequiredTwoFactorRoles('["admin", 7, "examiner"]')).toEqual(["admin", "examiner"]);
    expect(parseRequiredTwoFactorRoles("ungültig")).toEqual([]);
  });

  it("markiert eine Rollenpflicht genau nach 30 Tagen als überfällig", () => {
    const now = new Date("2026-08-18T10:00:00Z");
    expect(isTwoFactorRequirementOverdue("2026-07-19T10:00:00Z", now)).toBe(true);
    expect(isTwoFactorRequirementOverdue("2026-07-19T10:00:01Z", now)).toBe(false);
  });
});
