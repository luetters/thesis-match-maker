import { describe, expect, it } from "vitest";
import {
  buildSecondExaminerConfirmedEmail,
  buildSecondExaminerRejectedEmail,
  buildSecondExaminerRequestEmail,
  directAssignmentEmail,
  roleApprovedEmail,
  roleRejectedEmail,
} from "./emailTemplates";

describe("sprachabhängige Kommunikationsvorlagen", () => {
  it("liefert eine ausschließlich englische Rollenfreigabe für englische Nutzerprofile", () => {
    const email = roleApprovedEmail({
      userName: "Alex Example",
      roleLabel: "Examiner",
      dashboardPath: "/examiner",
      lang: "en",
    });

    expect(email.subject).toContain("activated");
    expect(email.html).toContain("Dear Alex Example");
    expect(email.html).not.toContain("Ihre Rolle wurde freigeschaltet");
    expect(email.text).toContain("Your role as Examiner has been activated");
  });

  it("enthält für neue Erstprüfer:innen den passenden deutschsprachigen Leitfadenlink", () => {
    const email = roleApprovedEmail({
      userName: "Prof. Beispiel",
      roleLabel: "Prüfer:in (Erstprüfer:in)",
      dashboardPath: "/examiner",
      examinerGuideRole: "examiner",
      lang: "de",
    });

    expect(email.html).toContain("Leitfaden für die Erstprüfung");
    expect(email.text).toContain("Leitfaden für die Erstprüfung herunterladen");
    expect(email.text).toContain("thesis-match-maker-erste-pruefung-leitfaden");
    expect(email.html).not.toContain("Leitfaden für die Zweitprüfung");
  });

  it("enthält für neue Zweitprüfer:innen den passenden englischsprachigen Leitfadenlink", () => {
    const email = roleApprovedEmail({
      userName: "Alex Example",
      roleLabel: "Second Examiner",
      dashboardPath: "/examiner",
      examinerGuideRole: "second_examiner",
      lang: "en",
    });

    expect(email.html).toContain("Second examiner guide");
    expect(email.text).toContain("download the Second examiner guide");
    expect(email.text).toContain("thesis-match-maker-zweite-pruefung-leitfaden");
    expect(email.html).not.toContain("Leitfaden für die Erstprüfung");
  });

  it("liefert Zweitprüfer:innenmails in der ausgewählten Sprache", () => {
    const request = buildSecondExaminerRequestEmail({ examinerName: "Sam", studentName: "Alex", thesisTitle: "Research", lang: "en" });
    const confirmed = buildSecondExaminerConfirmedEmail({ recipientName: "Sam", recipientRole: "student", secondExaminerName: "Taylor", thesisTitle: "Research", lang: "en" });
    const rejected = buildSecondExaminerRejectedEmail({ recipientName: "Sam", secondExaminerName: "Taylor", thesisTitle: "Research", lang: "en" });

    expect(request.subject).toContain("second examiner");
    expect(request.text).toContain("has selected you");
    expect(confirmed.subject).toContain("Second examiner confirmed");
    expect(rejected.text).toContain("has declined");
  });

  it("behält deutsche Kommunikation für deutsche Nutzerprofile bei", () => {
    const assignment = directAssignmentEmail({ examinerName: "Sam", role: "first", thesisTitle: "Forschung", lang: "de" });
    const rejection = roleRejectedEmail({ userName: "Sam", roleLabel: "Prüfer:in", lang: "de" });

    expect(assignment.subject).toContain("Zuweisung als Erstprüfer:in");
    expect(rejection.text).toContain("wurde abgelehnt");
  });
});
