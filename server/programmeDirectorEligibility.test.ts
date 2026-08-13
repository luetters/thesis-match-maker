import { describe, expect, it } from "vitest";
import { isEligibleForProgrammeDirector } from "./programmeDirectorEligibility";

describe("isEligibleForProgrammeDirector", () => {
  it("erlaubt Studiengangsleitung nur für Erstprüfer:innen", () => {
    expect(isEligibleForProgrammeDirector(["examiner", "second_examiner"])).toBe(true);
    expect(isEligibleForProgrammeDirector(["second_examiner"])).toBe(false);
    expect(isEligibleForProgrammeDirector(["admin"])).toBe(false);
  });
});
