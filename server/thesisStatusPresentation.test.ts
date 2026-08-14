import { describe, expect, it } from "vitest";
import { getThesisStatusPresentation } from "../shared/thesisStatusPresentation";

describe("Klartextstatus von Abschlussarbeiten", () => {
  it("priorisiert die bestätigte Verteidigungsfähigkeit", () => {
    expect(getThesisStatusPresentation({ status: "SECOND_EXAMINER_ACCEPTED", defenseEligibility: "approved" }).label).toBe("Thesis kann verteidigt werden");
  });

  it("ordnet die Gutachter:innen- und Arbeitsphasen verständlich zu", () => {
    expect(getThesisStatusPresentation({ status: "PENDING_FIRST_EXAMINER" }).label).toBe("Warten auf Erstgutachter:in");
    expect(getThesisStatusPresentation({ status: "PENDING_SECOND_EXAMINER" }).label).toBe("Warten auf Zweitgutachter:in");
    expect(getThesisStatusPresentation({ status: "MATCHED" }).label).toBe("Work in Progress");
    expect(getThesisStatusPresentation({ status: "COMPLETED" }).label).toBe("Arbeit abgegeben");
  });
});
