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
    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./");
    expect(dockerfile).toContain("COPY patches ./patches");
    expect(dockerfile).toContain("COPY vendor ./vendor");
    expect(dockerfile).toContain("pnpm install --frozen-lockfile --prod=false");
    expect(dockerfile).toContain("/app/drizzle.config.ts");
    expect(dockerfile).not.toContain("corepack enable");
  });

  it("liefert vendorte Sicherheitsabhängigkeiten auch im verwalteten Container-Build aus", () => {
    const dockerfile = readProjectFile("Dockerfile");
    const gitignore = readProjectFile(".gitignore");

    expect(dockerfile).toContain("COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./");
    expect(dockerfile).toContain("COPY vendor ./vendor");
    expect(gitignore).toContain("!vendor/*.tgz");
  });

  it("stellt einen kontrollierten HTW-Berlin-Deploy mit Schema-Schutz und täglicher Sicherung bereit", () => {
    const deploy = readProjectFile("deploy/htw-ubuntu-deploy.sh");
    const guide = readProjectFile("docs/HTW_Berlin_Ubuntu_Bereitstellung.md");
    const backupService = readProjectFile("deploy/systemd/thesis-match-maker-backup.service");
    const backupTimer = readProjectFile("deploy/systemd/thesis-match-maker-backup.timer");

    expect(deploy).toContain("--initialize-empty-database --confirm-empty-database");
    expect(deploy).toContain("chmod 600");
    expect(deploy).toContain("docker compose --env-file");
    expect(deploy).toContain("127.0.0.1:3000");
    expect(deploy).not.toContain("ufw allow");
    expect(guide).toContain("Keine öffentliche MySQL-Freigabe");
    expect(guide).toContain("Thesis Match Maker auf einem Ubuntu-Server der HTW Berlin");
    expect(backupService).toContain("scripts/selfhosted/backup.sh");
    expect(backupTimer).toContain("OnCalendar=*-*-* 02:17:00");
  });

  it("liefert eine image-basierte Produktionsvariante ohne Quellcode-Build auf dem Zielserver", () => {
    const imageCompose = readProjectFile("deploy/docker-compose.image.yml");
    const imageBuild = readProjectFile("deploy/build-thesis-image.sh");
    const imageDeploy = readProjectFile("deploy/htw-ubuntu-image-deploy.sh");
    const imageGuide = readProjectFile("docs/HTW_Berlin_Docker_Image_Bereitstellung.md");
    const environment = readProjectFile("deploy/environment.example");

    expect(imageCompose).toContain("image: ${THESIS_MATCH_IMAGE:?");
    expect(imageCompose).not.toContain("build:");
    expect(imageCompose).not.toContain('"3306:3306"');
    expect(imageBuild).toContain("docker build --pull");
    expect(imageBuild).toContain("docker image save");
    expect(imageBuild).toContain(":latest");
    expect(imageDeploy).toContain("docker compose --env-file");
    expect(imageDeploy).toContain("THESIS_MATCH_IMAGE");
    expect(imageDeploy).toContain("--confirm-empty-database");
    expect(imageGuide).toContain("Thesis Match Maker als Docker-Image bereitstellen");
    expect(environment).toContain("THESIS_MATCH_IMAGE=");
  });

  it("stellt einen manuell freigegebenen GitLab-Registry-Deploy mit geschützten Schlüsseldateien bereit", () => {
    const pipeline = readProjectFile(".gitlab-ci.yml");
    const deploy = readProjectFile("deploy/gitlab-ci-deploy.sh");
    const imageReference = readProjectFile("deploy/update-image-reference.sh");
    const guide = readProjectFile("docs/GitLab_HTW_Berlin_Deploy.md");

    expect(pipeline).toContain("when: manual");
    expect(pipeline).toContain("resource_group: thesis-match-maker-production");
    expect(pipeline).toContain("CI_COMMIT_SHA");
    expect(pipeline).toContain("DEPLOY_SSH_PRIVATE_KEY");
    expect(deploy).toContain("--password-stdin");
    expect(deploy).toContain("update-image-reference.sh");
    expect(imageReference).toContain("THESIS_MATCH_IMAGE");
    expect(imageReference).toContain("install -o root -g root -m 600");
    expect(guide).toContain("DEPLOY_SSH_KNOWN_HOSTS");
  });

  it("stellt einen manuell bestätigten GitHub-Actions-Deploy mit eingeschränktem Ubuntu-Zugang bereit", () => {
    const workflow = readProjectFile(".github/workflows/deploy-ubuntu-server.yml");
    const bootstrap = readProjectFile("deploy/github-ubuntu-bootstrap.sh");
    const guide = readProjectFile("docs/GitHub_Ubuntu_Deploy.md");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("DEPLOY_STARTEN");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("environment:\n      name: ubuntu-production");
    expect(workflow).toContain("UBUNTU_DEPLOY_SSH_PRIVATE_KEY");
    expect(workflow).toContain("UBUNTU_DEPLOY_SSH_KNOWN_HOSTS");
    expect(workflow).toContain("StrictHostKeyChecking=yes");
    expect(workflow).toContain("git archive --format=zip");
    expect(workflow).toContain("incoming/thesis-source.zip");
    expect(bootstrap).toContain("setup-thesis-deploy-user.sh");
    expect(bootstrap).toContain("deploy/.env");
    expect(bootstrap).not.toContain("curl | bash");
    expect(guide).toContain("UBUNTU_DEPLOY_HOST");
    expect(guide).toContain("DEPLOY_STARTEN");
    expect(guide).toContain("Port 3306 darf nicht öffentlich freigegeben werden");
  });

  it("stellt die leere Datenbankstruktur ohne Übernahme von Portaldaten bereit", () => {
    const schemaBootstrap = readProjectFile("scripts/selfhosted/bootstrap-schema.sh");
    const emptyTargetBootstrap = readProjectFile("scripts/selfhosted/bootstrap-empty-target.sh");
    const migration0075 = readProjectFile("drizzle/0075_tired_night_nurse.sql");
    const migration0027 = readProjectFile("drizzle/0027_mature_boomer.sql");

    expect(schemaBootstrap).toContain("drizzle-kit migrate --config=/app/drizzle.config.ts");
    expect(schemaBootstrap).toContain("Es wurden keine Portal- oder Transferdaten importiert");
    expect(schemaBootstrap).toContain("Drizzle-Migrationsdatei fehlt");
    expect(migration0075).toContain("SELECT 1;");
    expect(migration0027).not.toMatch(/^ALTER TABLE .* DROP PRIMARY KEY;/m);
    expect(migration0027).toContain("DROP INDEX `users_openId_unique`");
    expect(migration0027).not.toContain("DROP INDEX IF EXISTS");
    expect(emptyTargetBootstrap).toContain("--confirm-empty-target-reset");
    expect(emptyTargetBootstrap).toContain("down -v --remove-orphans");
    expect(emptyTargetBootstrap).toContain("build app");
    expect(emptyTargetBootstrap).toContain("drizzle-kit push --config=/app/drizzle.config.ts --force");
    expect(emptyTargetBootstrap).toContain("Schema-Initialisierung unvollständig: Tabelle users wurde nicht erzeugt");
    expect(emptyTargetBootstrap).toContain("Schema-Initialisierung durch Drizzle fehlgeschlagen.");
    expect(emptyTargetBootstrap).toContain("Es wurden keine Transferdaten importiert");
  });

  it("definiert für jede Auto-Increment-ID im aktuellen MySQL-Modell einen Primärschlüssel", () => {
    const schema = readProjectFile("drizzle/schema.ts");
    const unkeyedAutoIncrementIds = schema.match(/id:\s*int\(\)\.autoincrement\(\)\.notNull\(\),(?:\r?\n)/g) ?? [];

    expect(unkeyedAutoIncrementIds).toHaveLength(0);
  });

  it("hält den kombinierten SAML-Index unterhalb der MySQL-Schlüsselgrenze", () => {
    const schema = readProjectFile("drizzle/schema.ts");

    expect(schema).toContain('samlSubject: varchar("saml_subject", { length: 255 })');
    expect(schema).toContain('samlIssuer: varchar("saml_issuer", { length: 255 })');
  });

  it("verwendet kurze explizite MySQL-Namen für Fremdschlüssel langer Tabellennamen", () => {
    const schema = readProjectFile("drizzle/schema.ts");

    expect(schema).toContain('name: "cdc_doc_fk"');
    expect(schema).toContain('name: "cdc_author_fk"');
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

  it("bietet einen eingeschränkten GitHub-unabhängigen Deploy-Weg ohne interaktive Root-Shell", () => {
    const deploy = readProjectFile("scripts/selfhosted/thesis-deploy");
    const gateway = readProjectFile("scripts/selfhosted/thesis-deploy-gateway");
    const setup = readProjectFile("scripts/selfhosted/setup-thesis-deploy-user.sh");
    const windowsDeploy = readProjectFile("scripts/selfhosted/deploy-thesis-match.ps1");

    expect(deploy).toContain("--exclude='deploy/.env'");
    expect(deploy).toContain("unzip -tqq");
    expect(deploy).toContain("Health-Check erfolgreich");
    expect(deploy).toContain("Versuch $attempt/12");
    expect(deploy).toContain("Health-Check nach 60 Sekunden fehlgeschlagen");
    expect(deploy).not.toContain("trap 'rm -rf \"$staging_dir\"' RETURN");
    expect(gateway).toContain('"scp -t incoming/thesis-source.zip"');
    expect(gateway).toContain('"deploy"');
    expect(gateway).toContain("SSH_ORIGINAL_COMMAND");
    expect(setup).toContain('restrict,command="/usr/local/libexec/thesis-deploy-gateway"');
    expect(setup).toContain("NOPASSWD: /usr/local/sbin/thesis-deploy deploy");
    expect(windowsDeploy).toContain("scp -O -i $PrivateKeyPath");
    expect(windowsDeploy).toContain('"$UserName@$HostName" deploy');
  });

  it("bietet einen FileZilla-Deploy mit getrennter Freigabedatei statt automatischem Upload-Deploy", () => {
    const trigger = readProjectFile("scripts/selfhosted/thesis-sftp-deploy-trigger");
    const setup = readProjectFile("scripts/selfhosted/setup-thesis-filezilla-deploy.sh");

    expect(trigger).toContain("DEPLOY.ready");
    expect(trigger).toContain("thesis-source.zip");
    expect(trigger).toContain('"$DEPLOY_BIN" deploy');
    expect(trigger).toContain("failed");
    expect(setup).toContain("ForceCommand internal-sftp -d /incoming");
    expect(setup).toContain("PermitTTY no");
    expect(setup).toContain("PathChanged=/var/lib/thesis-deploy/incoming/DEPLOY.ready");
    expect(setup).toContain("thesis-sftp-deploy.path");
  });

  it("liefert eine lesende Administrator-Diagnose ohne Ausgabe von Geheimnissen oder Passwort-Reset", () => {
    const diagnostics = readProjectFile("scripts/selfhosted/verify-server-readonly.sh");
    const handover = readProjectFile("docs/Administrator_Abnahme_und_Restschritte.md");

    expect(diagnostics).toContain("--account-email");
    expect(diagnostics).toContain("passwort_hinterlegt");
    expect(diagnostics).toContain("HTTP %{http_code}");
    expect(diagnostics).toContain("thesis-sftp-deploy.path");
    expect(diagnostics).not.toContain("source \"$ENV_FILE\"");
    expect(diagnostics).not.toContain("UPDATE users");
    expect(handover).toContain("Bewusst noch nicht ausgeführte Schritte");
    expect(handover).toContain("Passwort-Reset-E-Mails");
  });

  it("liefert einen doppelt bestätigten lokalen Superadmin-Erstzugang ohne Klartextpasswort", () => {
    const bootstrap = readProjectFile("scripts/selfhosted/bootstrap-superadmin.sh");
    const containerScript = readProjectFile("scripts/selfhosted/bootstrap-superadmin.mjs");
    const guide = readProjectFile("docs/Superadmin_Erstzugang_HTW_Berlin.md");
    const dockerfile = readProjectFile("deploy/Dockerfile");

    expect(bootstrap).toContain("SUPERADMIN_ERSTZUGANG");
    expect(bootstrap).toContain("SUPERADMIN_WIEDERHERSTELLEN");
    expect(bootstrap).toContain("read -r -s password");
    expect(bootstrap).not.toContain("--password");
    expect(containerScript).toContain("bcrypt.hash(password, 12)");
    expect(containerScript).toContain("SUPERADMIN_INITIAL_ACCESS_PROVISIONED");
    expect(containerScript).toContain("SUPERADMIN_ACCESS_RECOVERED");
    expect(containerScript).toContain("FOR UPDATE");
    expect(containerScript).toContain("user_roles");
    expect(containerScript).not.toContain("console.log(password");
    expect(guide).toContain("Superadmin-Erstzugang auf dem HTW-Berlin-Server");
    expect(guide).toContain("bootstrap-superadmin.sh");
    expect(dockerfile).toContain("bootstrap-superadmin.mjs");
  });

  it("liefert eine additive, backup-gesicherte Schema-Reparatur ohne destruktive Datenbankbefehle", () => {
    const repair = readProjectFile("scripts/selfhosted/repair-auth-schema.sh");
    const guide = readProjectFile("docs/Schema_Reparatur_HTW_Berlin.md");

    expect(repair).toContain("--confirm SCHEMA_REPARATUR_NACH_BACKUP");
    expect(repair).toContain('"$BACKUP_SCRIPT" "$BACKUP_DIR"');
    expect(repair).toContain('"$VERIFY_BACKUP_SCRIPT" "$BACKUP_DIR"');
    expect(repair).toContain("ADD COLUMN IF NOT EXISTS");
    expect(repair).toContain("CREATE TABLE IF NOT EXISTS user_roles");
    expect(repair).toContain("ALTER TABLE system_settings");
    expect(repair).toContain("ALTER TABLE audit_log MODIFY COLUMN thesisRequestId int NULL");
    expect(repair).toContain("INSERT INTO user_roles");
    expect(repair).not.toContain("DROP TABLE");
    expect(repair).not.toContain("TRUNCATE TABLE");
    expect(repair).not.toContain("DELETE FROM");
    expect(repair).not.toContain("drizzle-kit");
    expect(guide).toContain("Datenbewahrende Schema-Reparatur");
    expect(guide).toContain("--initialize-empty-database");
  });

  it("liefert einen doppelt bestätigten Nutzer- und Vorgangsreset mit neuem Superadmin und deaktivierter 2FA-Pflicht", () => {
    const reset = readProjectFile("scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh");
    const databaseReset = readProjectFile("scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs");
    const storageCleanup = readProjectFile("scripts/selfhosted/cleanup-user-storage.mjs");
    const guide = readProjectFile("docs/Nutzer_und_Vorgangsreset_HTW_Berlin.md");
    const dockerfile = readProjectFile("deploy/Dockerfile");

    expect(reset).toContain("NUTZERDATEN_UND_VORGAENGE_LOESCHEN");
    expect(reset).toContain("NUR_NEUEN_SUPERADMIN_ANLEGEN");
    expect(reset).toContain('"$BACKUP_SCRIPT" "$BACKUP_DIR"');
    expect(reset).toContain('"$VERIFY_BACKUP_SCRIPT" "$BACKUP_DIR"');
    expect(reset).toContain("read -r -s password");
    expect(reset).not.toContain("--password");
    expect(databaseReset).toContain("USER_AND_PROCESS_DATA_RESET");
    expect(databaseReset).toContain("'twoFactorRequiredRoles', '[]'");
    expect(databaseReset).toContain("'superadmin'");
    expect(databaseReset).toContain("connection.beginTransaction()");
    expect(databaseReset).not.toContain("DROP TABLE");
    expect(databaseReset).not.toContain("TRUNCATE TABLE");
    expect(storageCleanup).toContain("privaten S3-Speicher");
    expect(storageCleanup).toContain("Ungültiger lokaler Speicherpfad");
    expect(guide).toContain("Nutzer- und Vorgangsreset");
    expect(guide).toContain("holger@luetters.net");
    expect(dockerfile).toContain("reset-user-data-and-bootstrap-superadmin.mjs");
    expect(dockerfile).toContain("cleanup-user-storage.mjs");
  });

  it("prüft die fest referenzierten öffentlichen Markenmedien über den lokalen Storage-Proxy", () => {
    const mediaVerify = readProjectFile("scripts/selfhosted/verify-public-media.sh");
    const guide = readProjectFile("docs/IONOS_Migrationsleitfaden.md");

    expect(mediaVerify).toContain('BASE_URL="${1:-http://127.0.0.1:3000}"');
    expect(mediaVerify).toContain('curl --fail --silent --show-error --location');
    expect(mediaVerify).toContain("InfrarotinBibliothek_458a4f63.mp4");
    expect(mediaVerify).toContain("thesis-match-maker-verwaltung-leitfaden_7ca2f6a1.pdf");
    expect(mediaVerify).not.toContain("S3_SECRET_KEY");
    expect(guide).toContain("verify-public-media.sh");
  });

  it("stellt den Bootstrap-Import nur lokal über einen eigenen Schlüssel bereit", () => {
    const compose = readProjectFile("deploy/docker-compose.yml");
    const bootstrap = readProjectFile("scripts/selfhosted/bootstrap-portable-import.sh");
    const request = readProjectFile("scripts/selfhosted/bootstrap-portable-request.mjs");
    const environment = readProjectFile("deploy/environment.example");

    expect(compose).toContain('"127.0.0.1:3000:3000"');
    expect(compose).toContain("TRANSFER_IMPORT_TOKEN: ${TRANSFER_IMPORT_TOKEN}");
    expect(bootstrap).toContain('docker exec "$CONTAINER_ID" node "$CONTAINER_REQUEST" import');
    expect(bootstrap).toContain('docker cp "$ARCHIVE_PATH" "$CONTAINER_ID:$CONTAINER_ARCHIVE"');
    expect(request).toContain("BOOTSTRAP_IMPORT");
    expect(request).toContain("127.0.0.1:3000/api/bootstrap/portable-transfer/");
    expect(environment).toContain("TRANSFER_IMPORT_TOKEN=CHANGE_ME_64_RANDOM_ALPHANUMERIC_CHARACTERS");
  });

  it("liefert eine lokale, nicht verändernde Vorschau vor dem Bootstrap-Import", () => {
    const preview = readProjectFile("scripts/selfhosted/bootstrap-portable-preview.sh");
    const request = readProjectFile("scripts/selfhosted/bootstrap-portable-request.mjs");
    const routes = readProjectFile("server/portableTransferImportRoutes.ts");

    expect(preview).toContain('docker exec "$CONTAINER_ID" node "$CONTAINER_REQUEST" preview');
    expect(preview).toContain('docker cp "$ARCHIVE" "$CONTAINER_ID:$CONTAINER_ARCHIVE"');
    expect(preview).toContain("read_transfer_import_token");
    expect(preview).toContain("tr -d '\\r'");
    expect(preview).not.toContain('source "$ENV_FILE"');
    expect(request).toContain("BOOTSTRAP_PREVIEW");
    expect(request).toContain("127.0.0.1:3000/api/bootstrap/portable-transfer/");
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
