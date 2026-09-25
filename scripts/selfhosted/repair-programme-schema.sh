#!/usr/bin/env bash
# Ergänzt ausschließlich fehlende Studiengangs- und Zuordnungstabellen.
# Dieses Werkzeug löscht keine Tabellen, Datensätze, Dateien oder Konten und
# führt bewusst keine historische Drizzle-Migrationskette aus.
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
  sudo repair-programme-schema.sh --check
  sudo repair-programme-schema.sh --apply --confirm STUDIENGANG_SCHEMA_NACH_BACKUP [--backup-dir /absoluter/pfad]

--check  (Standard) Prüft ausschließlich die Studiengangstabellen und deren
         aktuelle Struktur. Es werden keine Änderungen vorgenommen.
--apply  Erstellt zuerst eine vollständige, prüfsummengesicherte Sicherung.
         Danach werden ausschließlich fehlende Studiengangs-, Zuordnungs- und
         Inhaltsstrukturen additiv ergänzt. Bestehende Daten bleiben erhalten.

Das Werkzeug ist für eine bestehende Installation mit fehlender Tabelle
`programmes` vorgesehen. Es importiert keine Daten und ersetzt nicht die
kontrollierte Importvorschau im Portal.
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
  printf '\n=== Studiengangs-Schemastatus (lesend) ===\n'
  run_query <<'SQL'
SELECT DATABASE() AS aktive_datenbank;
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'users', 'programmes', 'programme_content_managers', 'programme_public_links',
    'programme_semester_deadlines', 'examiner_programmes', 'pav_programmes',
    '__drizzle_migrations'
  )
ORDER BY table_name;
SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    table_name = 'programmes'
    OR (table_name = 'users' AND column_name = 'programme_id')
  )
ORDER BY table_name, ordinal_position;
SQL
}

if [[ "$MODE" == "check" ]]; then
  print_status
  printf '\nPrüfung beendet. Es wurden keine Änderungen vorgenommen.\n'
  exit 0
fi

[[ "$CONFIRM" == "STUDIENGANG_SCHEMA_NACH_BACKUP" ]] || {
  printf 'Abbruch: Für --apply muss --confirm STUDIENGANG_SCHEMA_NACH_BACKUP angegeben werden.\n' >&2
  exit 2
}

[[ -x "$BACKUP_SCRIPT" && -x "$VERIFY_BACKUP_SCRIPT" ]] || {
  printf 'Backup- oder Prüfsystem fehlt oder ist nicht ausführbar. Keine Schemaänderung ausgeführt.\n' >&2
  exit 1
}

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="$PROJECT_DIR/backups/programme-schema-repair-$(date -u +%Y%m%dT%H%M%SZ)"
fi
[[ "$BACKUP_DIR" = /* ]] || {
  printf 'Der Backup-Pfad muss absolut sein. Keine Schemaänderung ausgeführt.\n' >&2
  exit 2
}
[[ ! -e "$BACKUP_DIR" ]] || {
  printf 'Der Backup-Pfad existiert bereits. Bitte einen neuen Pfad wählen. Keine Schemaänderung ausgeführt.\n' >&2
  exit 2
}

printf '%s\n' 'Erstelle Sicherung vor der additiven Studiengangs-Schemaergänzung …'
"$BACKUP_SCRIPT" "$BACKUP_DIR"
"$VERIFY_BACKUP_SCRIPT" "$BACKUP_DIR"

TEMP_SQL="$(mktemp)"
cat > "$TEMP_SQL" <<'SQL'
-- Ausschließlich additive Definitionen für Studiengänge und ihre Zuordnungen.
-- Keine DROP-, DELETE-, TRUNCATE-, UPDATE- oder Import-Anweisungen.
CREATE TABLE IF NOT EXISTS programmes (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  abbreviation varchar(32) NOT NULL,
  level enum('bachelor','master') NOT NULL,
  fachbereich varchar(8) NOT NULL DEFAULT 'FB3',
  pictogram_url varchar(512) NULL,
  information text NULL,
  logo_url varchar(512) NULL,
  logo_key varchar(512) NULL,
  is_published tinyint NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_programmes_abbreviation (abbreviation),
  UNIQUE KEY uq_programmes_fachbereich_name_level (fachbereich, name, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS examiner_programmes (
  id int NOT NULL AUTO_INCREMENT,
  examiner_id int NOT NULL,
  programme_id int NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY uq_ep (examiner_id, programme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pav_programmes (
  id int NOT NULL AUTO_INCREMENT,
  pav_user_id int NOT NULL,
  programme_id int NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_content_managers (
  id int NOT NULL AUTO_INCREMENT,
  programme_id int NOT NULL,
  user_id int NOT NULL,
  manager_type enum('speaker','admin') NOT NULL,
  assigned_by int NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pcm_programme_user_type (programme_id, user_id, manager_type),
  KEY idx_pcm_user (user_id),
  KEY idx_pcm_programme (programme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_public_links (
  id int NOT NULL AUTO_INCREMENT,
  programme_id int NOT NULL,
  title varchar(160) NOT NULL,
  description text NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_by int NOT NULL,
  updated_by int NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ppl_programme (programme_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programme_semester_deadlines (
  id int NOT NULL AUTO_INCREMENT,
  department varchar(8) NOT NULL,
  programme_id int NULL,
  semester varchar(32) NOT NULL,
  registration_deadline datetime NOT NULL,
  submission_deadline datetime NOT NULL,
  updated_by int NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY psd_department_semester_idx (department, semester),
  KEY psd_programme_semester_idx (programme_id, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN IF NOT EXISTS programme_id int NULL;
SQL

printf '%s\n' 'Ergänze fehlende Studiengangsstrukturen …'
run_query < "$TEMP_SQL"

printf '%s\n' 'Prüfe die Studiengangsstruktur nach der Ergänzung …'
print_status
printf '\nStudiengangs-Schemaergänzung abgeschlossen. Es wurden keine Portaldaten importiert oder gelöscht. Führen Sie erst danach die Importvorschau im Portal aus.\n'
