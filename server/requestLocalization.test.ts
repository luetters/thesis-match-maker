import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getStatusBadge } from "../shared/const";
import { getRegistrationDocumentGuidance } from "../shared/registrationDocumentGuidance";

const projectRoot = resolve(import.meta.dirname, "..");

describe("Lokalisierung der Request-Ansicht", () => {
  it("liefert englische Statusbadges, auch für eine angenommene Zweitprüfung", () => {
    expect(getStatusBadge("SECOND_EXAMINER_ACCEPTED", "en").label).toBe("Second examiner accepted");
    expect(getStatusBadge("PENDING_SECOND_EXAMINER", "en").label).toBe("Awaiting second examiner");
    expect(getStatusBadge("SECOND_EXAMINER_ACCEPTED", "de").label).toBe("Zweitgutachter:in zugestimmt");
  });

  it("liefert den Einreichhinweis in der gewählten Sprache", () => {
    const english = getRegistrationDocumentGuidance({ department: "Department 3", targetSemester: "WS2026", language: "en" });
    const german = getRegistrationDocumentGuidance({ department: "FB 3", targetSemester: "WS2026", language: "de" });

    expect(english.deadlineText).toContain("binding submission deadline");
    expect(german.deadlineText).toContain("verbindliche Einreichungsfrist");
  });

  it("bindet Request-Karten und Statusbenachrichtigungen an die aktive Sprache", () => {
    const source = readFileSync(resolve(projectRoot, "client/src/pages/StudentDashboard.tsx"), "utf8");

    expect(source).toContain("t.student.requestSummaryPdf");
    expect(source).toContain("t.student.registrationNextStep");
    expect(source).toContain("t.student.notificationAcceptedTitle");
    expect(source).toContain("language: lang");
    expect(source).toContain("displayTitle");
    expect(source).not.toContain("{latest.title}");
  });
});
