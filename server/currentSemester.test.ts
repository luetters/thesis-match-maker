import { describe, expect, it } from "vitest";
import { getCurrentSemesterValue } from "../shared/currentSemester";

describe("aktuelles Semester", () => {
  it("ordnet Sommer- und Wintersemester korrekt zu", () => {
    expect(getCurrentSemesterValue(new Date(2026, 4, 15))).toBe("SoSe2026");
    expect(getCurrentSemesterValue(new Date(2026, 10, 15))).toBe("WS2026");
    expect(getCurrentSemesterValue(new Date(2027, 1, 15))).toBe("WS2026");
  });
});
