import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("Studierendenanleitung, Freigabesortierung und Registrierungsrückmeldungen", () => {
  it("bietet auf der Startseite einen dreistufigen, zweisprachigen Einstieg für Studierende", () => {
    const onboarding = readFileSync(projectFile("client", "src", "components", "LandingOnboarding.tsx"), "utf8");
    expect(onboarding).toContain("Start für Studierende");
    expect(onboarding).toContain("Student quick start");
    expect(onboarding).toContain("1. Registrieren");
    expect(onboarding).toContain("2. Arbeit vorbereiten");
    expect(onboarding).toContain("3. Anfrage verfolgen");
    expect(onboarding).toContain('href="/login"');
    expect(onboarding).toContain("thesis-match-maker-student-guide_4615c09b.pdf");
    expect(onboarding).toContain("Kurzleitfaden als PDF herunterladen");
    expect(onboarding).toContain("download");
  });

  it("filtert neue Registrierungen nach Fachbereich und sortiert sie nach Anmeldedatum", () => {
    const approvals = readFileSync(projectFile("client", "src", "components", "RoleApprovalTab.tsx"), "utf8");
    expect(approvals).toContain("departmentFilter");
    expect(approvals).toContain('departmentFilter === "unassigned"');
    expect(approvals).toContain("sortOrder");
    expect(approvals).toContain("getRegisteredAtMs(right) - getRegisteredAtMs(left)");
    expect(approvals).toContain("Neueste zuerst");
    expect(approvals).toContain("Älteste zuerst");
  });

  it("zeigt bei Registrierung einen zugänglichen Ladezustand und verständliche Inline-Fehler", () => {
    const login = readFileSync(projectFile("client", "src", "pages", "Login.tsx"), "utf8");
    expect(login).toContain("registrationError");
    expect(login).toContain('role="alert"');
    expect(login).toContain("Registrierung nicht abgeschlossen");
    expect(login).toContain('role="status"');
    expect(login).toContain("Registrierung wird sicher übermittelt");
    expect(login).toContain("showRegistrationError");
  });
});
