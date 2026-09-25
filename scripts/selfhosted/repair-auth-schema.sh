#!/usr/bin/env bash
# Additive Reparatur der für Anmeldung, Rollen und 2FA benötigten Datenbankstruktur.
# Erstellt oder ergänzt nur fehlende Schemaelemente. Löscht keine Tabellen, Daten,
# Dateien oder Konten und führt keine historischen Drizzle-Migrationen aus.
set -Eeuo pipefail

readonly PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
readonly ENV_FILE="$PROJECT_DIR/deploy/.env"
readonly COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
readonly BACKUP_SCRIPT="$PROJECT_DIR/scripts/selfhosted/backup.sh"
readonly VERIFY_BACKUP_SCRIPT="$PROJECT_DIR/scripts/selfhosted/verify-backup.sh"

MODE="check"
CONFIRM=""
BACKUP_DIR=""
TEMP_SQL=""

cleanup() {
  [[ -n "$TEMP_SQL" && -f "$TEMP_SQL" ]] && rm -f "$TEMP_SQL"
}
trap cleanup EXIT

usage() {
  cat <<'USAGE'
Verwendung:
  sudo repair-auth-schema.sh --check
  sudo repair-auth-schema.sh --apply --confirm SCHEMA_REPARATUR_NACH_BACKUP [--backup-dir /absoluter/pfad]

--check  (Standard) Gibt ausschließlich den Status der Anmeldungs-, Rollen- und
         Zwei-Faktor-Schemaelemente aus. Es werden keine Änderungen vorgenommen.
--apply  Erstellt zuerst ein konsistentes Backup mit Prüfsummen und ergänzt danach
         ausschließlich fehlende Spalten und Tabellen. Bestehende Werte, Tabellen,
         Dateien und Konten werden nicht gelöscht.

Das Werkzeug ist für einen Schemaunterschied zwischen dem aktuellen Portalcode und
bestehenden Datenbankdaten vorgesehen. Es ersetzt keine Datenübernahme.
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
    --confirm)
      CONFIRM="${2:-}"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="${2:-}"
      shift 2
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
  printf 'Dieses Werkzeug muss mit sudo ausgeführt werden.\n' >&2
  exit 1
}

[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" ]] || {
  printf 'Deploy-Konfiguration oder geschützte Laufzeitdatei fehlt. Keine Prüfung ausgeführt.\n' >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || {
  printf 'Docker ist nicht verfügbar. Keine Prüfung ausgeführt.\n' >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

compose ps --services --status running | grep -qx 'db' || {
  printf 'Der Datenbankcontainer läuft nicht. Keine Schemaänderung ausgeführt.\n' >&2
  exit 1
}

run_query() {
  compose exec -T db sh -lc 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --raw -u"$MYSQL_USER" "$MYSQL_DATABASE"' "$@"
}

print_status() {
  printf '\n=== Datenbank- und Migrationsstatus (lesend) ===\n'
  run_query <<'SQL'
SELECT DATABASE() AS aktive_datenbank;
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('users', 'user_roles', 'login_attempts', 'password_reset_tokens', 'two_factor_recovery_codes', 'system_settings', 'audit_log', '__drizzle_migrations')
ORDER BY table_name;
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'users'
  AND column_name IN (
    'id', 'openId', 'email', 'loginMethod', 'role', 'passwordHash', 'createdAt', 'updatedAt', 'lastSignedIn',
    'two_factor_secret', 'two_factor_enabled', 'two_factor_confirmed_at', 'two_factor_last_used_step',
    'saml_subject', 'saml_issuer', 'saml_linked_at', 'programme_id', 'preferredLanguage', 'roleStatus',
    'requestedRole', 'roleConfirmedBy', 'roleConfirmedAt', 'second_email', 'is_fictitious_example',
    'banner_color', 'banner_image_url', 'banner_image_key'
  )
ORDER BY ordinal_position;
SELECT role, COUNT(*) AS anzahl
FROM users
GROUP BY role
ORDER BY role;
SELECT COUNT(*) AS anzahl_offene_identities
FROM users
WHERE openId IS NULL OR openId = '';
SQL
}

if [[ "$MODE" == "check" ]]; then
  print_status
  printf '\nPrüfung beendet. Es wurden keine Änderungen vorgenommen.\n'
  exit 0
fi

[[ "$CONFIRM" == "SCHEMA_REPARATUR_NACH_BACKUP" ]] || {
  printf 'Abbruch: Für --apply muss --confirm SCHEMA_REPARATUR_NACH_BACKUP angegeben werden.\n' >&2
  exit 2
}

[[ -x "$BACKUP_SCRIPT" && -x "$VERIFY_BACKUP_SCRIPT" ]] || {
  printf 'Backup- oder Prüfsystem fehlt oder ist nicht ausführbar. Keine Schemaänderung ausgeführt.\n' >&2
  exit 1
}

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="$PROJECT_DIR/backups/schema-repair-$(date -u +%Y%m%dT%H%M%SZ)"
fi
[[ "$BACKUP_DIR" = /* ]] || {
  printf 'Der Backup-Pfad muss absolut sein. Keine Schemaänderung ausgeführt.\n' >&2
  exit 2
}
[[ ! -e "$BACKUP_DIR" ]] || {
  printf 'Der Backup-Pfad existiert bereits. Bitte einen neuen Pfad wählen. Keine Schemaänderung ausgeführt.\n' >&2
  exit 2
}

printf '%s\n' 'Erstelle Sicherung vor der additiven Schema-Reparatur …'
"$BACKUP_SCRIPT" "$BACKUP_DIR"
"$VERIFY_BACKUP_SCRIPT" "$BACKUP_DIR"

TEMP_SQL="$(mktemp)"
cat > "$TEMP_SQL" <<'SQL'
-- Ausschließlich additive Definitionen für einen aktuellen Passwortlogin.
-- Keine DROP-, DELETE-, TRUNCATE- oder Datenimport-Anweisungen.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name text NULL,
  ADD COLUMN IF NOT EXISTS email varchar(320) NULL,
  ADD COLUMN IF NOT EXISTS openId varchar(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS loginMethod varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  ADD COLUMN IF NOT EXISTS banner_image_key varchar(512) NULL;

-- Das aktuelle Rollenmodell benötigt diese Werte. Bestehende Rollen bleiben unverändert.
ALTER TABLE users MODIFY COLUMN role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL DEFAULT 'student';

-- Nur fehlende technische Kennungen werden aufgefüllt; vorhandene Kennungen bleiben unverändert.
UPDATE users
SET openId = CONCAT('legacy_', id)
WHERE openId IS NULL OR openId = '';

CREATE TABLE IF NOT EXISTS user_roles (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  role enum('user','admin','student','examiner','second_examiner','superadmin','pav','dean','vice_dean','programme_director') NOT NULL,
  assigned_by int NULL,
  assigned_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY uq_user_role (user_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id int NOT NULL AUTO_INCREMENT,
  email varchar(320) NOT NULL,
  success tinyint NOT NULL DEFAULT 0,
  failure_reason varchar(128) NULL,
  ip_address varchar(64) NULL,
  user_agent varchar(512) NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_la_email (email),
  KEY idx_la_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id int NOT NULL AUTO_INCREMENT,
  token varchar(128) NOT NULL,
  user_id int NOT NULL,
  expires_at timestamp NOT NULL,
  used int NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  code_hash varchar(255) NOT NULL,
  used_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tfrc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id int NOT NULL AUTO_INCREMENT,
  `key` varchar(128) NOT NULL,
  value text NOT NULL,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by_id int NULL,
  PRIMARY KEY (id),
  KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS `key` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS value text NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_by_id int NULL;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditereignisse ohne konkreten Thesis-Fall (z. B. ein kontrollierter
-- Datenreset) müssen revisionssicher protokollierbar sein.
ALTER TABLE audit_log MODIFY COLUMN thesisRequestId int NULL;

-- Bereits vorhandene Hauptrollen werden als Mehrrollen übernommen, ohne vorhandene Einträge zu verändern.
INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
SELECT u.id, u.role, NULL, NOW()
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role = u.role
WHERE ur.id IS NULL;
SQL

printf '%s\n' 'Wende additive Schema-Reparatur an …'
run_query < "$TEMP_SQL"

printf '%s\n' 'Prüfe die Anmeldungsstruktur nach der Reparatur …'
print_status
printf '\nSchema-Reparatur abgeschlossen. Die Daten wurden nicht gelöscht. Prüfen Sie nun zuerst den lokalen HTTP-Status und danach die Anmeldung.\n'
