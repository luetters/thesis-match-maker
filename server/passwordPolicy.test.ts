import { describe, expect, it } from "vitest";
import { getPasswordPolicyError, getPasswordStrength, PASSWORD_MIN_LENGTH } from "../shared/passwordPolicy";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Passwortregeln", () => {
  it("fordert mindestens zwölf Zeichen und drei Zeichengruppen", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(getPasswordStrength("Borschtsch2026!").meetsRequirements).toBe(true);
    expect(getPasswordStrength("nurkleinbuchstaben").meetsRequirements).toBe(false);
    expect(getPasswordStrength("Kurz1!").meetsRequirements).toBe(false);
  });

  it("stellt für nicht erfüllte Regeln eine eindeutige Fehlermeldung bereit", () => {
    expect(getPasswordPolicyError("Kurz1!")).toContain("mindestens 12");
    expect(getPasswordPolicyError("Nurkleinbuchstaben")).toContain("mindestens drei Gruppen");
    expect(getPasswordPolicyError("Borschtsch2026!")).toBeNull();
  });

  it("erzwingt die gemeinsame Regel bei Registrierung, Reset und eigener Passwortänderung", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router.match(/getPasswordPolicyError\(input\.newPassword\)/g)).toHaveLength(2);
    expect(router).toContain("getPasswordPolicyError(input.password)");
  });

  it("zeigt die gemeinsame Stärkeanzeige bei Registrierung, Reset und im eigenen Profil", () => {
    const login = readFileSync(resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");
    const reset = readFileSync(resolve(process.cwd(), "client/src/pages/ResetPassword.tsx"), "utf8");
    const profile = readFileSync(resolve(process.cwd(), "client/src/pages/Profile.tsx"), "utf8");
    const securityPanel = readFileSync(resolve(process.cwd(), "client/src/components/PasswordSecurityPanel.tsx"), "utf8");

    expect(login).toContain('<PasswordStrengthIndicator password={regPassword} lang={lang} dark />');
    expect(reset).toContain('<PasswordStrengthIndicator password={password} lang={lang} />');
    expect(profile).toContain('user?.loginMethod === "password" && <PasswordSecurityPanel />');
    expect(securityPanel).toContain('currentPassword');
    expect(securityPanel).toContain('PasswordStrengthIndicator');
  });
});
