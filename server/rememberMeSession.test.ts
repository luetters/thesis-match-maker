import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Sichere Funktion Angemeldet bleiben", () => {
  it("speichert keine Zugangsdaten im Browser und übermittelt nur die Sitzungsoption", () => {
    const loginPage = readFileSync(resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");

    expect(loginPage).toContain("rememberMe,");
    expect(loginPage).toContain("L.rememberMeHint");
    expect(loginPage).not.toContain("tmm_remember_email");
    expect(loginPage).not.toContain("localStorage.setItem");
  });

  it("stellt nur bei aktivierter Auswahl ein langlebiges HTTP-only-Cookie aus", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

    expect(router).toContain("rememberMe: z.boolean().optional().default(false)");
    expect(router).toContain("const sessionAgeMs = input.rememberMe ? SESSION_MAX_AGE_MS : BROWSER_SESSION_MAX_AGE_MS");
    expect(router).toContain("input.rememberMe\n          ? { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS }\n          : cookieOptions");
  });
});
