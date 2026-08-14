import { describe, expect, it } from "vitest";
import { resolveProgrammeSemesterDeadline } from "../shared/programmeSemesterDeadline";
import { getColloquiumSchedulingStartState } from "../shared/colloquiumSchedulingAccess";

describe("Fristenregeln und Terminfindung", () => {
  const rules = [
    { id: 1, department: "FB3", programmeId: null, semester: "WS2026", registrationDeadline: "2026-10-01", submissionDeadline: "2027-04-01" },
    { id: 2, department: "FB3", programmeId: 17, semester: "WS2026", registrationDeadline: "2026-09-15", submissionDeadline: "2027-03-15" },
  ];

  it("bevorzugt die studiengangsspezifische Frist vor dem Fachbereichsstandard", () => {
    expect(resolveProgrammeSemesterDeadline(rules, { department: "FB3", programmeId: 17, semester: "WS2026" })?.id).toBe(2);
    expect(resolveProgrammeSemesterDeadline(rules, { department: "FB3", programmeId: 18, semester: "WS2026" })?.id).toBe(1);
  });

  it("sperrt die Terminfindung bis zur Verteidigungsfreigabe", () => {
    expect(getColloquiumSchedulingStartState([{ secondExaminerId: 3, defenseEligibility: "pending" }])).toMatchObject({ enabled: false, hint: "Studierender nicht verteidigungsfähig" });
    expect(getColloquiumSchedulingStartState([{ secondExaminerId: 3, defenseEligibility: "approved" }]).enabled).toBe(true);
  });
});
