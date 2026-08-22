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

  it("baut den VPS-Container ohne störungsanfällige Corepack-Aktivierung und mit pnpm-Patches", () => {
    const dockerfile = readProjectFile("deploy/Dockerfile");

    expect(dockerfile).toContain("npm install --global pnpm@10.4.1");
    expect(dockerfile).toContain("COPY patches ./patches");
    expect(dockerfile).toContain("pnpm install --frozen-lockfile --prod=false");
    expect(dockerfile).not.toContain("corepack enable");
  });

  it("liefert getrennte Backup-, Wiederherstellungs- und Prüfskripte ohne fest kodierte Zugangsdaten", () => {
    const backup = readProjectFile("scripts/selfhosted/backup.sh");
    const restore = readProjectFile("scripts/selfhosted/restore.sh");
    const verify = readProjectFile("scripts/selfhosted/verify-backup.sh");
    const preflight = readProjectFile("scripts/selfhosted/preflight-export.sh");
    const exportManifest = readProjectFile("scripts/selfhosted/create-export-manifest.sh");
    const sealBackup = readProjectFile("scripts/selfhosted/seal-backup.sh");

    expect(backup).toContain("mysqldump --single-transaction");
    expect(backup).toContain("SHA256SUMS");
    expect(restore).toContain('"RESTORE"');
    expect(verify).toContain("sha256sum -c SHA256SUMS");
    expect(preflight).toContain("kein Export wurde ausgeführt");
    expect(preflight).not.toContain("mysqldump");
    expect(exportManifest).toContain("EXPORT-MANIFEST.md");
    expect(sealBackup).toContain("openssl enc -aes-256-cbc");
    expect(sealBackup).not.toContain("-pass ");
    expect(backup).not.toMatch(/password\s*=\s*['"][^$]/i);
  });

  it("stellt den Bootstrap-Import nur lokal über einen eigenen Schlüssel bereit", () => {
    const compose = readProjectFile("deploy/docker-compose.yml");
    const bootstrap = readProjectFile("scripts/selfhosted/bootstrap-portable-import.sh");
    const environment = readProjectFile("deploy/environment.example");

    expect(compose).toContain('"127.0.0.1:3000:3000"');
    expect(compose).toContain("TRANSFER_IMPORT_TOKEN: ${TRANSFER_IMPORT_TOKEN}");
    expect(bootstrap).toContain("BOOTSTRAP_IMPORT");
    expect(bootstrap).toContain("http://127.0.0.1:3000/api/bootstrap/portable-transfer/import");
    expect(environment).toContain("TRANSFER_IMPORT_TOKEN=CHANGE_ME_64_RANDOM_ALPHANUMERIC_CHARACTERS");
  });

  it("liefert eine lokale, nicht verändernde Vorschau vor dem Bootstrap-Import", () => {
    const preview = readProjectFile("scripts/selfhosted/bootstrap-portable-preview.sh");
    const routes = readProjectFile("server/portableTransferImportRoutes.ts");

    expect(preview).toContain("BOOTSTRAP_PREVIEW");
    expect(preview).toContain('source "$ENV_FILE"');
    expect(preview).toContain("TOKEN=\"${TOKEN//$'\\r'/}\"");
    expect(preview).toContain("127.0.0.1:3000/api/bootstrap/portable-transfer/preview");
    expect(routes).toContain('"/api/bootstrap/portable-transfer/preview"');
    expect(routes).toContain("targetIsEmpty");
  });

  it("dokumentiert den getrennten Export-, Prüfsummen- und Wiederherstellungsweg", () => {
    const guide = readProjectFile("docs/Exportvorbereitung_Thesis_Match_Maker.md");
    const acceptance = readProjectFile("docs/Exportfenster_und_Abnahmeprotokoll.md");

    expect(guide).toContain("preflight-export.sh");
    expect(guide).toContain("verify-backup.sh");
    expect(guide).toContain("DNS-Wechsel");
    expect(guide).toContain("Produktivexport wird bewusst nicht automatisch");
    expect(acceptance).toContain("Go-/No-Go-Entscheidung");
    expect(acceptance).toContain("verschlüsselte Sicherung");
  });
});
