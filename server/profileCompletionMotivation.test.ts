import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("freiwillige Motivationsstrecke zur Profilpflege", () => {
  it("ermittelt den Fortschritt aus bestehenden, rollenbezogenen Angaben ohne neue Pflichtdaten", () => {
    const component = readFileSync(projectFile("client", "src", "components", "ProfileCompletionCard.tsx"), "utf8");
    expect(component).toContain("All additions are voluntary");
    expect(component).toContain("Alle Ergänzungen sind freiwillig");
    expect(component).toContain('role === "student"');
    expect(component).toContain('role === "admin" || role === "superadmin"');
    expect(component).toContain("examinerResearchFocus");
    expect(component).toContain("const percent = Math.round");
  });

  it("verlinkt sicher in den bestehenden Bearbeitungsmodus des eigenen Profils", () => {
    const component = readFileSync(projectFile("client", "src", "components", "ProfileCompletionCard.tsx"), "utf8");
    const profile = readFileSync(projectFile("client", "src", "pages", "Profile.tsx"), "utf8");
    expect(component).toContain("onEdit");
    expect(component).toContain("Profil ergänzen");
    expect(profile).toContain("<ProfileCompletionCard");
    expect(profile).toContain("onEdit={handleEditStart}");
  });

  it("meldet ein vollständiges Profil positiv, ohne weitere Eingaben einzufordern", () => {
    const component = readFileSync(projectFile("client", "src", "components", "ProfileCompletionCard.tsx"), "utf8");
    expect(component).toContain("if (percent === 100)");
    expect(component).toContain("Ihr Profil ist vollständig.");
    expect(component).toContain("Your profile is complete.");
  });
});
