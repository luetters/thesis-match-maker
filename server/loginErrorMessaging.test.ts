import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Passwort-Loginfehlermeldungen", () => {
  it("leitet ungültige Zugangsdaten nicht fälschlich zur Neuregistrierung um", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");
    const loginMutation = source.slice(source.indexOf("const loginMutation"), source.indexOf("const registerMutation"));

    expect(loginMutation).not.toContain('setLoginStatus("not_found")');
    expect(loginMutation).toContain("toast.error(msg || L.loginFailed)");
  });

  it("bietet den Passwort-Reset unabhängig von einer fehlgeschlagenen Anmeldung an", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");

    expect(source).toContain("requestReset.mutate({ email: loginEmail.trim(), origin: window.location.origin })");
    expect(source).toContain("L.forgotPassword");
  });

  it("hebt fehlgeschlagene Passwortanmeldungen zugänglich hervor und verlinkt direkt den Resetweg", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");

    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="assertive"');
    expect(source).toContain("loginErrorMessage");
    expect(source).toContain("handlePasswordReset");
    expect(source).toContain("motion-reduce:animate-none");
  });
});
