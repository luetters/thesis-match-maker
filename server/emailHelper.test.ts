import { describe, expect, it, vi } from "vitest";

// Mock nodemailer so no real SMTP connection is needed in tests
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id-123" }),
    })),
  },
}));

import { sendExaminerCTAEmail, sendStatusChangeEmail } from "./emailHelper";

describe("emailHelper: sendExaminerCTAEmail", () => {
  it("gibt false zurück wenn SMTP nicht konfiguriert ist", async () => {
    // Temporär SMTP_HOST entfernen
    const originalHost = process.env.SMTP_HOST;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const result = await sendExaminerCTAEmail({
      to: "prof@htw-berlin.de",
      examinerName: "Prof. Dr. Schmidt",
      studentName: "Max Mustermann",
      thesisTitle: "KI-Analyse",
      department: "Informatik",
      acceptUrl: "https://app.example.com/examiner/respond?token=abc&action=accept",
      rejectUrl: "https://app.example.com/examiner/respond?token=abc&action=reject",
    });

    expect(result).toBe(false);

    // Wiederherstellen
    if (originalHost) process.env.SMTP_HOST = originalHost;
    if (originalUser) process.env.SMTP_USER = originalUser;
    if (originalPass) process.env.SMTP_PASS = originalPass;
  });

  it("gibt true zurück wenn SMTP konfiguriert ist (gemockt)", async () => {
    // Simuliere konfiguriertes SMTP
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_PORT = "587";

    const result = await sendExaminerCTAEmail({
      to: "prof@htw-berlin.de",
      examinerName: "Prof. Dr. Schmidt",
      studentName: "Max Mustermann",
      thesisTitle: "KI-Analyse von Kundenfeedback",
      department: "M.Sc. Wirtschaftsinformatik",
      acceptUrl: "https://app.example.com/examiner/respond?token=abc&action=accept",
      rejectUrl: "https://app.example.com/examiner/respond?token=abc&action=reject",
    });

    expect(result).toBe(true);
  });
});

describe("emailHelper: sendStatusChangeEmail", () => {
  it("sendet ACCEPTED-Benachrichtigung (gemockt)", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";

    const result = await sendStatusChangeEmail({
      to: "student@htw-berlin.de",
      studentName: "Max Mustermann",
      thesisTitle: "KI-Analyse",
      newStatus: "ACCEPTED",
      dashboardUrl: "https://app.example.com/student",
    });

    expect(result).toBe(true);
  });

  it("sendet MATCHED-Benachrichtigung mit Glückwunsch (gemockt)", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";

    const result = await sendStatusChangeEmail({
      to: "student@htw-berlin.de",
      studentName: "Anna Müller",
      thesisTitle: "Blockchain im Supply Chain",
      newStatus: "MATCHED",
      dashboardUrl: "https://app.example.com/student",
    });

    expect(result).toBe(true);
  });

  it("sendet REJECTED-Benachrichtigung mit Begründung (gemockt)", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";

    const result = await sendStatusChangeEmail({
      to: "student@htw-berlin.de",
      studentName: "Jonas Weber",
      thesisTitle: "Quantencomputing",
      newStatus: "REJECTED",
      reason: "Thema außerhalb meiner Expertise",
      dashboardUrl: "https://app.example.com/student",
    });

    expect(result).toBe(true);
  });
});
