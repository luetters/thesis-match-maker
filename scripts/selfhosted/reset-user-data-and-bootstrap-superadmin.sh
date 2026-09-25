#!/usr/bin/env bash
# Kontrollierter Reset aller Nutzer- und Vorgangsdaten mit anschließendem Superadmin-Erstzugang.
# Erhält Stammdaten und öffentliche Inhalte gemäß der dokumentierten Variante B.
set -Eeuo pipefail

readonly PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
readonly ENV_FILE="$PROJECT_DIR/deploy/.env"
readonly COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
readonly BACKUP_SCRIPT="$PROJECT_DIR/scripts/selfhosted/backup.sh"
readonly VERIFY_BACKUP_SCRIPT="$PROJECT_DIR/scripts/selfhosted/verify-backup.sh"
readonly RESET_CONTAINER_SCRIPT="/app/scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs"
readonly STORAGE_CONTAINER_SCRIPT="/app/scripts/selfhosted/cleanup-user-storage.mjs"

MODE="check"
ACCOUNT_EMAIL=""
ACCOUNT_NAME=""
BACKUP_DIR=""
KEY_MANIFEST=""
password=""
password_confirmation=""

cleanup() {
  [[ -n "$KEY_MANIFEST" && -f "$KEY_MANIFEST" ]] && rm -f "$KEY_MANIFEST"
  unset password password_confirmation
}
trap cleanup EXIT

usage() {
  cat <<'USAGE'
Verwendung:
  sudo reset-user-data-and-bootstrap-superadmin.sh --check
  sudo reset-user-data-and-bootstrap-superadmin.sh --apply --email name@example.org --name "Vor- und Nachname" [--backup-dir /absoluter/pfad]

--check  Zeigt ausschließlich Datenmengen und die erhaltenen Stammdatentabellen an.
--apply  Erstellt ein vollständiges, prüfbares Backup. Nach zwei lokalen Bestätigungen
         löscht der Vorgang alle Konten, Rollen, 2FA-Daten, Thesis-Vorgänge,
         Uploadreferenzen, Benachrichtigungen und Auditdaten. Danach wird genau ein
         Superadmin-Konto mit verdeckt eingegebenem Portalpasswort angelegt.

Erhalten bleiben ausschließlich Studiengänge, öffentliche Studiengangsinhalte,
allgemeine FAQ-/Leitfaden-Aggregate, E-Mail-Vorlagen, Fristregeln und allgemeine
Systemeinstellungen. Die globale 2FA-Rollenpflicht wird auf [] gesetzt.
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
    --email)
      ACCOUNT_EMAIL="${2:-}"
      shift 2
      ;;
    --name)
      ACCOUNT_NAME="${2:-}"
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
  printf 'Deploy-Konfiguration oder geschützte Laufzeitdatei fehlt. Kein Reset ausgeführt.\n' >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  printf 'Docker ist nicht verfügbar. Kein Reset ausgeführt.\n' >&2
  exit 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

run_db_query() {
  compose exec -T db sh -lc 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --raw -u"$MYSQL_USER" "$MYSQL_DATABASE"' "$@"
}

print_preview() {
  printf '\n=== Reset-Vorschau (nur lesend) ===\n'
  run_db_query <<'SQL'
SELECT 'active_database' AS bereich, DATABASE() AS wert;
SELECT 'operational_table' AS bereich, table_name AS wert, table_rows AS anzahl
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'users', 'user_roles', 'thesis_requests', 'published_thesis_abstracts',
    'colloquiums', 'colloquium_scheduling_polls', 'conditional_documents',
    'notifications', 'audit_log', 'login_attempts', 'two_factor_recovery_codes',
    'password_reset_tokens', 'examiner_profiles', 'examiner_public_resources'
  )
ORDER BY table_name;
SELECT 'preserved_table' AS bereich, table_name AS wert, table_rows AS anzahl
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'programmes', 'programme_public_links', 'programme_semester_deadlines',
    'email_templates', 'reminder_templates', 'system_settings', 'faq_feedback',
    'faq_rating_totals', 'guide_download_totals'
  )
ORDER BY table_name;
SELECT 'two_factor_required_roles' AS bereich, COALESCE(value, '[]') AS wert
FROM system_settings
WHERE `key` = 'twoFactorRequiredRoles';
SQL
}

compose ps --services --status running | grep -qx 'db' || {
  printf 'Der Datenbankcontainer läuft nicht. Kein Reset ausgeführt.\n' >&2
  exit 1
}

if [[ "$MODE" == "check" ]]; then
  print_preview
  printf '\nVorschau beendet. Es wurden keine Änderungen vorgenommen.\n'
  exit 0
fi

[[ "$MODE" == "apply" ]] || {
  usage >&2
  exit 2
}
[[ "$ACCOUNT_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ && ${#ACCOUNT_EMAIL} -le 320 ]] || {
  printf 'Ungültige E-Mail-Adresse für das neue Superadmin-Konto.\n' >&2
  exit 2
}
[[ ${#ACCOUNT_NAME} -ge 2 && ${#ACCOUNT_NAME} -le 200 ]] || {
  printf 'Der Superadmin-Name muss zwischen 2 und 200 Zeichen lang sein.\n' >&2
  exit 2
}
[[ -x "$BACKUP_SCRIPT" && -x "$VERIFY_BACKUP_SCRIPT" ]] || {
  printf 'Backup- oder Prüfsystem fehlt oder ist nicht ausführbar. Kein Reset ausgeführt.\n' >&2
  exit 1
}

if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="$PROJECT_DIR/backups/user-data-reset-$(date -u +%Y%m%dT%H%M%SZ)"
fi
[[ "$BACKUP_DIR" = /* && ! -e "$BACKUP_DIR" ]] || {
  printf 'Der Backup-Pfad muss absolut sein und darf noch nicht existieren. Kein Reset ausgeführt.\n' >&2
  exit 2
}

print_preview
printf '\nACHTUNG: Alle Nutzer- und Vorgangsdaten werden gelöscht. Erhalten bleiben nur die in der Vorschau genannten Stammdaten und öffentlichen Inhalte.\n'
printf 'Zum Fortfahren exakt NUTZERDATEN_UND_VORGAENGE_LOESCHEN eingeben: '
read -r confirmation_one
[[ "$confirmation_one" == "NUTZERDATEN_UND_VORGAENGE_LOESCHEN" ]] || {
  printf 'Bestätigung stimmt nicht überein. Kein Reset ausgeführt.\n' >&2
  exit 1
}
printf 'Zum Anlegen genau eines neuen Superadmins exakt NUR_NEUEN_SUPERADMIN_ANLEGEN eingeben: '
read -r confirmation_two
[[ "$confirmation_two" == "NUR_NEUEN_SUPERADMIN_ANLEGEN" ]] || {
  printf 'Bestätigung stimmt nicht überein. Kein Reset ausgeführt.\n' >&2
  exit 1
}
printf 'Neues lokales Portalpasswort (verdeckt): '
read -r -s password
printf '\nPasswort wiederholen: '
read -r -s password_confirmation
printf '\n'
[[ "$password" == "$password_confirmation" ]] || {
  printf 'Die Passwörter stimmen nicht überein. Kein Reset ausgeführt.\n' >&2
  exit 1
}

printf '%s\n' 'Erstelle vollständige Sicherung vor dem Reset …'
"$BACKUP_SCRIPT" "$BACKUP_DIR"
"$VERIFY_BACKUP_SCRIPT" "$BACKUP_DIR"

KEY_MANIFEST="$(mktemp)"
chmod 600 "$KEY_MANIFEST"
# Nur Schlüssel personenbezogener Dateien sammeln. Öffentliche Studiengangslogos,
# Leitfäden und sonstige allgemeine Medien werden nicht aufgenommen.
run_db_query <<'SQL' > "$KEY_MANIFEST"
SELECT avatarKey FROM users WHERE avatarKey IS NOT NULL AND avatarKey <> ''
UNION
SELECT banner_image_key FROM users WHERE banner_image_key IS NOT NULL AND banner_image_key <> ''
UNION
SELECT photoKey FROM examiner_profiles WHERE photoKey IS NOT NULL AND photoKey <> ''
UNION
SELECT storageKey FROM examiner_public_resources WHERE storageKey IS NOT NULL AND storageKey <> ''
UNION
SELECT exposeKey FROM thesis_requests WHERE exposeKey IS NOT NULL AND exposeKey <> ''
UNION
SELECT storage_key FROM conditional_documents WHERE storage_key IS NOT NULL AND storage_key <> '';
SQL

printf '%s\n' 'Entferne ausschließlich referenzierte personenbezogene Dateien aus dem aktiven Speicher …'
compose exec -T app node "$STORAGE_CONTAINER_SCRIPT" < "$KEY_MANIFEST"

printf '%s\n' 'Lösche Nutzer- und Vorgangsdaten und lege den neuen Superadmin an …'
printf '%s\n' "$password" | compose exec -T app node "$RESET_CONTAINER_SCRIPT" \
  --email "$ACCOUNT_EMAIL" --name "$ACCOUNT_NAME"

printf '%s\n' 'Starte die Anwendung kontrolliert neu, damit bestehende Sitzungen sicher ungültig werden …'
compose up -d --no-deps app
for attempt in $(seq 1 12); do
  if curl -fsS --max-time 10 http://127.0.0.1:3000/ >/dev/null; then
    break
  fi
  [[ "$attempt" -lt 12 ]] || {
    printf 'Der lokale Health-Check ist nach dem Reset fehlgeschlagen. Das geprüfte Backup bleibt erhalten: %s\n' "$BACKUP_DIR" >&2
    exit 1
  }
  sleep 5
done

printf '\nReset abgeschlossen. Backup: %s\n' "$BACKUP_DIR"
printf '%s\n' 'Alle vorherigen Konten und Sitzungen sind entfernt. 2FA ist global nicht verpflichtend. Melden Sie sich ausschließlich mit dem neu angelegten Superadmin-Konto an.'
