import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Akzentfarben der Zwei-Faktor-Authentifizierung", () => {
  it("verwendet für die Zwei-Faktor-Aktionen die helle Akzentfarbe statt Dunkelgrün oder Blau", () => {
    const profilePanel = readFileSync(resolve(process.cwd(), "client/src/components/TwoFactorProfilePanel.tsx"), "utf8");
    const adminDashboard = readFileSync(resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");

    expect(profilePanel).not.toContain("bg-[#2f6f2f]");
    expect(profilePanel.match(/bg-\[#76B900\]/g)).toHaveLength(2);
    expect(adminDashboard.match(/2FA einrichten[\s\S]{0,400}?bg-blue-700/g)).toBeNull();
    expect(adminDashboard.match(/bg-\[#76B900\]/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
