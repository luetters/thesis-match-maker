import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("unabhängiges Übergabepaket", () => {
  it("kombiniert Datenbank, Anwendung und HTTPS-Proxy ohne öffentliche Datenbankports", () => {
    const compose = readProjectFile("deploy/docker-compose.yml");

    expect(compose).toContain("caddy:");
    expect(compose).toContain("image: caddy:2.8-alpine");
    expect(compose).toContain("- \"80:80\"");
    expect(compose).toContain("- \"443:443\"");
    expect(compose).toContain("SCHEDULER_ENABLED: \"true\"");
    expect(compose).toContain("ENABLE_LEGACY_PLATFORM_INTEGRATIONS: \"false\"");
    expect(compose).toContain("S3_ACCESS_KEY: ${S3_ACCESS_KEY:-}");
    expect(compose).not.toContain('"3306:3306"');
  });

  it("stellt eine geheimnisfreie Konfigurationsvorlage und klare Schutzvorgaben bereit", () => {
    const environment = readProjectFile("deploy/environment.example");
    const secrets = readProjectFile("deploy/SECRETS.md");

    expect(environment).toContain("CHANGE_ME_64_RANDOM_ALPHANUMERIC_CHARACTERS");
    expect(environment).not.toMatch(/(sk_live|AKIA|BEGIN PRIVATE KEY)/i);
    expect(secrets).toContain("niemals in Git");
    expect(secrets).toContain("TWO_FACTOR_ENCRYPTION_KEY");
  });

  it("liefert getrennte Backup-, Wiederherstellungs- und Prüfskripte ohne fest kodierte Zugangsdaten", () => {
    const backup = readProjectFile("scripts/selfhosted/backup.sh");
    const restore = readProjectFile("scripts/selfhosted/restore.sh");
    const verify = readProjectFile("scripts/selfhosted/verify-backup.sh");

    expect(backup).toContain("mysqldump --single-transaction");
    expect(backup).toContain("SHA256SUMS");
    expect(restore).toContain('"RESTORE"');
    expect(verify).toContain("sha256sum -c SHA256SUMS");
    expect(backup).not.toMatch(/password\s*=\s*['"][^$]/i);
  });
});
