import { describe, expect, it } from "vitest";
import { createIcsEvent } from "./icsHelper";

describe("Kolloquiums-ICS-Export", () => {
  it("enthält Raum, Online-Link und den Online-Link als Kalender-URL", () => {
    const ics = createIcsEvent({
      title: "Kolloquium: Digitale Transformation",
      start: new Date("2026-10-14T10:00:00Z"),
      durationMinutes: 60,
      location: "Campus Treskowallee – C 201",
      onlineLink: "https://meet.example.org/kolloquium-123",
      thesisTitle: "Digitale Transformation",
      studentName: "Max Mustermann",
      colloquiumId: 42,
    });

    expect(ics).toContain("LOCATION:Campus Treskowallee – C 201");
    expect(ics).toContain("Online-Teilnahme: https://meet.example.org/kolloquium-123");
    expect(ics).toContain("URL:https://meet.example.org/kolloquium-123");
  });
});
