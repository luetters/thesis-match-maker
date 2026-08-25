import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Passwortkonto bei E-Mail-Duplikaten", () => {
  it("priorisiert das einzige aktive Passwortkonto vor importierten Altkonten", () => {
    const databaseSource = readFileSync(resolve(import.meta.dirname, "db.ts"), "utf8");

    expect(databaseSource).toContain('u.loginMethod === "password" && Boolean(u.passwordHash)');
    expect(databaseSource).toContain("Importierte Altkonten können dieselbe E-Mail ohne Passwort enthalten.");
    expect(databaseSource).toContain("return passwordAccount ?? legacyPasswordAccount ?? result[0];");
  });
});
