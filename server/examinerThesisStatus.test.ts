import { describe, expect, it } from "vitest";
import { getDeadlineUrgency, getReadableThesisStatus, isAwaitingExaminerReview } from "../shared/examinerThesisStatus";

describe("Erweiterte Thesis-Statusansicht für Prüfer:innen", () => {
  it("ordnet Statuswerte verständlichen Phasen zu", () => {
    expect(getReadableThesisStatus({ status: "PENDING_FIRST_EXAMINER" }).label).toBe("Warten auf Erstgutachter:in");
    expect(getReadableThesisStatus({ status: "PENDING_SECOND_EXAMINER" }).label).toBe("Warten auf Zweitgutachter:in");
    expect(getReadableThesisStatus({ status: "COMPLETED" }).label).toBe("Arbeit abgegeben");
    expect(getReadableThesisStatus({ status: "MATCHED", defenseEligibility: "approved" }).label).toBe("Thesis kann verteidigt werden");
  });

  it("unterscheidet überfällige und bald fällige Abgaben", () => {
    const now = new Date("2026-08-14T12:00:00");
    expect(getDeadlineUrgency("2026-08-13", now)).toBe("overdue");
    expect(getDeadlineUrgency("2026-08-20", now)).toBe("due_soon");
    expect(getDeadlineUrgency("2026-09-30", now)).toBe("scheduled");
  });

  it("filtert nur tatsächlich bei der aktuellen Person ausstehende Begutachtungen", () => {
    expect(isAwaitingExaminerReview({ status: "PENDING_FIRST_EXAMINER", examinerId: 7 }, 7)).toBe(true);
    expect(isAwaitingExaminerReview({ status: "PENDING_SECOND_EXAMINER", secondExaminerId: 8 }, 7)).toBe(false);
  });
});
