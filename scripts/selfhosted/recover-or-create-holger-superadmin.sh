#!/usr/bin/env bash
# Eigenständige, kontrollierte Reaktivierung bzw. Anlage genau eines Superadmin-Kontos.
# Bearbeitet ausschließlich holger@luetters.net; löscht keine Nutzer, Vorgänge,
# Dateien, Studiengänge, E-Mail-Vorlagen oder sonstigen Portalinhalt.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/thesis-match-maker}"
readonly ENV_FILE="$APP_DIR/deploy/.env"
readonly COMPOSE_FILE="$APP_DIR/deploy/docker-compose.yml"
readonly ACCOUNT_EMAIL="holger@luetters.net"
readonly ACCOUNT_NAME="Holger Lütters"

MODE="check"
PASSWORD=""
PASSWORD_CONFIRMATION=""
TEMP_NODE_SCRIPT=""
CONTAINER_NODE_SCRIPT=""

cleanup() {
  [[ -n "$TEMP_NODE_SCRIPT" && -f "$TEMP_NODE_SCRIPT" ]] && rm -f "$TEMP_NODE_SCRIPT"
  if [[ -n "$CONTAINER_NODE_SCRIPT" ]]; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app rm -f "$CONTAINER_NODE_SCRIPT" >/dev/null 2>&1 || true
  fi
  unset PASSWORD PASSWORD_CONFIRMATION
}
trap cleanup EXIT

usage() {
  cat <<'USAGE'
Verwendung:
  sudo recover-or-create-holger-superadmin.sh --check
  sudo recover-or-create-holger-superadmin.sh --apply

--check  Prüft ausschließlich, ob genau ein passendes Konto vorhanden ist und ob
         alle für die sichere Reaktivierung nötigen Tabellen und Spalten vorliegen.
--apply  Reaktiviert das vorhandene Konto holger@luetters.net oder legt es an,
         setzt seine Rolle auf superadmin, aktiviert den Kontostatus und vergibt
         ein neues lokales Portalpasswort. Die 2FA dieses Kontos wird zurückgesetzt;
         die globale 2FA-Rollenpflicht wird auf [] gesetzt.

Das Skript verändert keine anderen Konten, keine Thesis-Vorgänge, keine Dateien,
keine Studiengänge, keine E-Mail-Vorlagen, keine SMTP- oder Domain-Einstellungen.
Das Passwort wird ausschließlich verdeckt abgefragt und niemals ausgegeben.

Falls die neue Datenbank nur die Anmeldungs- und Rollenfelder noch nicht enthält,
ergänzt --apply ausschließlich diese technischen Felder und Hilfstabellen additiv.
Es werden dabei keine vorhandenen Datensätze oder Fachvorgänge gelöscht.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --apply)
      MODE="apply"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

[[ "$EUID" -eq 0 ]] || {
  printf 'Dieses Skript muss mit sudo ausgeführt werden.\n' >&2
  exit 1
}
[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || {
  printf 'Deploy-Konfiguration oder geschützte Laufzeitdatei fehlt. Keine Änderung ausgeführt.\n' >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  printf 'Docker ist nicht verfügbar. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

compose ps --services --status running | grep -qx 'db' || {
  printf 'Der Datenbankcontainer läuft nicht. Keine Änderung ausgeführt.\n' >&2
  exit 1
}
compose ps --services --status running | grep -qx 'app' || {
  printf 'Der Anwendungscontainer läuft nicht. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

if [[ "$MODE" == "check" ]]; then
  printf '\n=== Superadmin-Reaktivierungscheck (nur lesend) ===\n'
  compose exec -T -e "ACCOUNT_EMAIL=$ACCOUNT_EMAIL" db sh -lc '
    MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --raw -u"$MYSQL_USER" "$MYSQL_DATABASE" <<"SQL"
SELECT DATABASE() AS aktive_datenbank;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ("users", "user_roles", "system_settings", "two_factor_recovery_codes", "audit_log")
ORDER BY table_name;
SELECT column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = "users"
ORDER BY column_name;
SELECT id, email, role
FROM users
WHERE LOWER(email) = LOWER("$ACCOUNT_EMAIL") ORDER BY id;
SQL
  '
  printf '\nPrüfung beendet. Es wurden keine Änderungen vorgenommen.\n'
  exit 0
fi

[[ "$MODE" == "apply" ]] || {
  usage >&2
  exit 2
}

printf '%s\n' 'Es wird ausschließlich holger@luetters.net als Superadmin reaktiviert oder angelegt.'
printf '%s\n' 'Das Konto erhält ein neues lokales Portalpasswort. Seine 2FA-Codes werden entfernt; die globale 2FA-Rollenpflicht wird deaktiviert.'
printf 'Zum Fortfahren exakt SUPERADMIN_HOLGER_REAKTIVIEREN eingeben: '
read -r confirmation_one
[[ "$confirmation_one" == "SUPERADMIN_HOLGER_REAKTIVIEREN" ]] || {
  printf 'Bestätigung stimmt nicht überein. Keine Änderung ausgeführt.\n' >&2
  exit 1
}
printf 'Zum Zurücksetzen der 2FA exakt 2FA_FUER_HOLGER_DEAKTIVIEREN eingeben: '
read -r confirmation_two
[[ "$confirmation_two" == "2FA_FUER_HOLGER_DEAKTIVIEREN" ]] || {
  printf 'Bestätigung stimmt nicht überein. Keine Änderung ausgeführt.\n' >&2
  exit 1
}
printf 'Neues lokales Portalpasswort (verdeckt): '
read -r -s PASSWORD
printf '\nPasswort wiederholen: '
read -r -s PASSWORD_CONFIRMATION
printf '\n'
[[ "$PASSWORD" == "$PASSWORD_CONFIRMATION" ]] || {
  printf 'Die Passwörter stimmen nicht überein. Keine Änderung ausgeführt.\n' >&2
  exit 1
}

TEMP_NODE_SCRIPT="$(mktemp)"
CONTAINER_NODE_SCRIPT="/tmp/recover-holger-superadmin-$$.mjs"
chmod 600 "$TEMP_NODE_SCRIPT"
cat > "$TEMP_NODE_SCRIPT" <<'NODE'
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

const email = "holger@luetters.net";
const name = "Holger Lütters";
const password = (await new Promise((resolve, reject) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  process.stdin.on("error", reject);
})).replace(/\r?\n$/, "");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
if (!process.env.DATABASE_URL) fail("Datenbankverbindung ist nicht konfiguriert.");
if (password.includes("\n") || password.includes("\r")) fail("Passwörter mit Zeilenumbrüchen sind nicht zulässig.");
const categoryCount = [/[a-zäöüß]/.test(password), /[A-ZÄÖÜ]/.test(password), /\d/.test(password), /[^A-Za-zÄÖÜäöüß0-9\s]/.test(password)].filter(Boolean).length;
if (password.length < 12 || password.length > 128 || categoryCount < 3) {
  fail("Das Passwort erfüllt nicht die Portalregel: 12 bis 128 Zeichen und mindestens drei Zeichengruppen.");
}

const required = [
  ["users", "id"], ["users", "openId"], ["users", "email"], ["users", "name"], ["users", "loginMethod"],
  ["users", "role"], ["users", "roleStatus"], ["users", "passwordHash"], ["users", "two_factor_secret"],
  ["users", "two_factor_enabled"], ["users", "two_factor_confirmed_at"], ["users", "two_factor_last_used_step"], ["users", "lastSignedIn"],
  ["user_roles", "user_id"], ["user_roles", "role"], ["user_roles", "assigned_by"], ["user_roles", "assigned_at"],
  ["system_settings", "key"], ["system_settings", "value"], ["system_settings", "updated_by_id"],
  ["two_factor_recovery_codes", "user_id"],
];

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  // Eine umgezogene Datenbank kann den aktuellen Anmeldungs- und Rollenstand noch
  // nicht enthalten. Diese ausschließlich additiven DDL-Anweisungen ermöglichen
  // die kontrollierte Wiederherstellung, ohne Nutzer- oder Vorgangsdaten zu löschen.
  await connection.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS openId varchar(64) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS name text NULL,
      ADD COLUMN IF NOT EXISTS email varchar(320) NULL,
      ADD COLUMN IF NOT EXISTS loginMethod varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student',
      ADD COLUMN IF NOT EXISTS createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS passwordHash varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS two_factor_secret text NULL,
      ADD COLUMN IF NOT EXISTS two_factor_enabled tinyint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS two_factor_confirmed_at timestamp NULL,
      ADD COLUMN IF NOT EXISTS two_factor_last_used_step int NULL,
      ADD COLUMN IF NOT EXISTS saml_subject varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS saml_issuer varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS saml_linked_at timestamp NULL,
      ADD COLUMN IF NOT EXISTS programme_id int NULL,
      ADD COLUMN IF NOT EXISTS preferredLanguage enum('de','en') NOT NULL DEFAULT 'de',
      ADD COLUMN IF NOT EXISTS roleStatus enum('approved','pending','rejected') NOT NULL DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS requestedRole enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NULL,
      ADD COLUMN IF NOT EXISTS roleConfirmedBy int NULL,
      ADD COLUMN IF NOT EXISTS roleConfirmedAt timestamp NULL,
      ADD COLUMN IF NOT EXISTS avatarUrl text NULL,
      ADD COLUMN IF NOT EXISTS avatarKey varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS bio text NULL,
      ADD COLUMN IF NOT EXISTS phone varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS department varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS matrikel_nr varchar(32) NULL,
      ADD COLUMN IF NOT EXISTS thesis_type enum('bachelor','master') NULL,
      ADD COLUMN IF NOT EXISTS enrollment_semester varchar(32) NULL,
      ADD COLUMN IF NOT EXISTS plagiarism_consent tinyint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_review_consent tinyint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS first_name varchar(128) NULL,
      ADD COLUMN IF NOT EXISTS last_name varchar(128) NULL,
      ADD COLUMN IF NOT EXISTS academic_title varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS office_room varchar(64) NULL,
      ADD COLUMN IF NOT EXISTS target_semester varchar(20) NULL,
      ADD COLUMN IF NOT EXISTS office_hours text NULL,
      ADD COLUMN IF NOT EXISTS research_tags text NULL,
      ADD COLUMN IF NOT EXISTS staff_id varchar(32) NULL,
      ADD COLUMN IF NOT EXISTS responsibility_area varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS office_location varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS second_email varchar(320) NULL,
      ADD COLUMN IF NOT EXISTS website varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS linked_in varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS research_gate varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS htw_profile_url varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS misc_link varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS booking_url varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS is_fictitious_example tinyint NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS banner_color varchar(32) NULL,
      ADD COLUMN IF NOT EXISTS banner_image_url text NULL,
      ADD COLUMN IF NOT EXISTS banner_image_key varchar(512) NULL,
      ADD COLUMN IF NOT EXISTS lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
  await connection.query(`
    ALTER TABLE users
      MODIFY COLUMN role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student'
  `);
  await connection.query(`
    UPDATE users
    SET openId = CONCAT('legacy_', id)
    WHERE openId IS NULL OR openId = ''
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id int NOT NULL AUTO_INCREMENT,
      user_id int NOT NULL,
      role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL,
      assigned_by int NULL,
      assigned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_role (user_id, role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    ALTER TABLE user_roles
      ADD COLUMN IF NOT EXISTS user_id int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student',
      ADD COLUMN IF NOT EXISTS assigned_by int NULL,
      ADD COLUMN IF NOT EXISTS assigned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id int NOT NULL AUTO_INCREMENT,
      \`key\` varchar(128) NOT NULL,
      value text NOT NULL,
      updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_id int NULL,
      PRIMARY KEY (id),
      KEY \`key\` (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
      id int NOT NULL AUTO_INCREMENT,
      user_id int NOT NULL,
      code_hash varchar(255) NOT NULL,
      used_at timestamp NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_tfrc_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id int NOT NULL AUTO_INCREMENT,
      thesisRequestId int NULL,
      actorId int NULL,
      actorRole varchar(32) NULL,
      action varchar(128) NOT NULL,
      fromStatus varchar(32) NULL,
      toStatus varchar(32) NULL,
      reason text NULL,
      metadata json NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query("ALTER TABLE audit_log MODIFY COLUMN thesisRequestId int NULL");

  const [missing] = await connection.execute(
    `SELECT requested.table_name, requested.column_name
     FROM (
       ${required.map(([table, column]) => `SELECT '${table}' AS table_name, '${column}' AS column_name`).join(" UNION ALL ")}
     ) requested
     LEFT JOIN information_schema.columns actual
       ON actual.table_schema = DATABASE()
      AND actual.table_name = requested.table_name
      AND actual.column_name = requested.column_name
     WHERE actual.column_name IS NULL`,
  );
  if (missing.length > 0) fail("Das erforderliche Anmeldungs- und Rollen-Schema ist unvollständig. Keine Änderung ausgeführt.");

  await connection.beginTransaction();
  const [accounts] = await connection.execute(
    "SELECT id FROM users WHERE LOWER(email) = ? ORDER BY id FOR UPDATE",
    [email],
  );
  if (accounts.length > 1) {
    await connection.rollback();
    fail("Mehrere Konten mit dieser E-Mail-Adresse gefunden. Keine Änderung ausgeführt.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let userId;
  let action;
  if (accounts.length === 1) {
    userId = accounts[0].id;
    await connection.execute(
      `UPDATE users
       SET name = COALESCE(NULLIF(name, ''), ?), loginMethod = 'password', role = 'superadmin',
           roleStatus = 'approved', passwordHash = ?, two_factor_secret = NULL,
           two_factor_enabled = 0, two_factor_confirmed_at = NULL, two_factor_last_used_step = NULL,
           lastSignedIn = NOW()
       WHERE id = ?`,
      [name, passwordHash, userId],
    );
    action = "SUPERADMIN_ACCOUNT_RECOVERED";
  } else {
    const openId = `pw_bootstrap_${randomUUID().replaceAll("-", "")}`;
    const [result] = await connection.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role, roleStatus, passwordHash, two_factor_enabled, lastSignedIn)
       VALUES (?, ?, ?, 'password', 'superadmin', 'approved', ?, 0, NOW())`,
      [openId, name, email, passwordHash],
    );
    userId = result.insertId;
    action = "SUPERADMIN_ACCOUNT_CREATED";
  }

  await connection.execute("DELETE FROM two_factor_recovery_codes WHERE user_id = ?", [userId]);
  await connection.execute(
    "INSERT IGNORE INTO user_roles (user_id, role, assigned_by, assigned_at) VALUES (?, 'superadmin', ?, NOW())",
    [userId, userId],
  );
  await connection.execute("DELETE FROM system_settings WHERE `key` = 'twoFactorRequiredRoles'");
  await connection.execute(
    "INSERT INTO system_settings (`key`, value, updated_by_id) VALUES ('twoFactorRequiredRoles', '[]', ?)",
    [userId],
  );

  const [auditTable] = await connection.execute(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'audit_log' AND column_name = 'thesisRequestId' AND is_nullable = 'YES' LIMIT 1",
  );
  if (auditTable.length > 0) {
    await connection.execute(
      "INSERT INTO audit_log (thesisRequestId, actorId, actorRole, action, reason, metadata) VALUES (NULL, ?, 'superadmin', ?, 'Kontrollierte Reaktivierung oder Anlage des Superadmin-Kontos.', ?)",
      [userId, action, JSON.stringify({ twoFactorRequiredRoles: [] })],
    );
  }

  await connection.commit();
  process.stdout.write("Superadmin-Konto erfolgreich verarbeitet. Die neue Anmeldung ist erst nach Ab- und erneutem Anmelden sichtbar.\n");
} catch {
  try { await connection.rollback(); } catch { /* ursprünglicher Fehler bleibt maßgeblich */ }
  process.stderr.write("Superadmin-Reaktivierung fehlgeschlagen. Es wurden keine Zugangsdaten ausgegeben. Prüfen Sie den Schema-Check.\n");
  process.exitCode = 1;
} finally {
  await connection.end();
}
NODE

app_container_id="$(compose ps -q app)"
[[ -n "$app_container_id" ]] || {
  printf 'Der Anwendungscontainer wurde nicht gefunden. Keine Änderung ausgeführt.\n' >&2
  exit 1
}
docker cp "$TEMP_NODE_SCRIPT" "$app_container_id:$CONTAINER_NODE_SCRIPT"
printf '%s\n' "$PASSWORD" | compose exec -T app node "$CONTAINER_NODE_SCRIPT"

printf '%s\n' 'Kontovorgang abgeschlossen. Melden Sie sich ab und danach ausschließlich mit holger@luetters.net erneut an.'
