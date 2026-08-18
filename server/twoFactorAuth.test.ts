import { describe, expect, it } from "vitest";
import { createTwoFactorSetup, generateRecoveryCodes, isAdminAccount, verifyTwoFactorCode } from "./twoFactorAuth";
import * as OTPAuth from "otpauth";

describe("2FAS-kompatible TOTP-Helfer", () => {
  it("erzeugt eine Standard-TOTP-URL für Authenticator-Apps", () => {
    const setup = createTwoFactorSetup("admin@htw-berlin.de");
    expect(setup.secret.length).toBeGreaterThan(10);
    expect(setup.otpauthUrl).toContain("otpauth://totp/");
  });

  it("prüft einen gültigen Sechsstellen-TOTP-Code", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
    expect(verifyTwoFactorCode(secret, totp.generate()).valid).toBe(true);
  });

  it("erlaubt 2FA nur für Administrationskonten", () => {
    expect(isAdminAccount("admin")).toBe(true);
    expect(isAdminAccount("superadmin")).toBe(true);
    expect(isAdminAccount("examiner")).toBe(false);
  });

  it("erzeugt eindeutige Wiederherstellungscodes im lesbaren Format", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[A-F0-9]{5}-[A-F0-9]{5}$/.test(code))).toBe(true);
  });
});
