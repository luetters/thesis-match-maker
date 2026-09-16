#!/usr/bin/env bash
# Lesende Betriebsdiagnose für eine selbst gehostete Thesis-Match-Maker-Instanz.
# Ändert weder Daten, Konfiguration, Container, DNS noch Zugangsdaten.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/thesis-match-maker}"
readonly COMPOSE_FILE="$APP_DIR/deploy/docker-compose.yml"
readonly ENV_FILE="$APP_DIR/deploy/.env"
readonly RELEASE_DIR="/var/lib/thesis-deploy/releases"

account_email=""

usage() {
  cat <<'USAGE'
Verwendung:
  sudo verify-server-readonly.sh [--account-email name@example.org]

Die Ausgabe enthält ausschließlich Betriebsstatus und minimierte Kontometadaten.
Passwörter, Passwort-Hashes, Tokens und Konfigurationswerte werden nicht ausgegeben.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --account-email)
      account_email="${2:-}"
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
  printf 'Dieses Prüfskript muss mit sudo ausgeführt werden.\n' >&2
  exit 1
}

[[ -f "$COMPOSE_FILE" && -f "$ENV_FILE" ]] || {
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

printf '\n=== Containerstatus ===\n'
compose ps

printf '\n=== Lokaler HTTP-Health-Check ===\n'
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' --max-time 10 http://127.0.0.1:3000/ || true

printf '\n=== Letzte kontrollierte Releases ===\n'
if [[ -d "$RELEASE_DIR" ]]; then
  find "$RELEASE_DIR" -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TT %f\n' | sort | tail -n 5 || true
else
  printf 'Keine Releaseablage vorhanden.\n'
fi

printf '\n=== FileZilla-Deploy-Auslöser ===\n'
for unit in thesis-sftp-deploy.path thesis-sftp-deploy.service; do
  if systemctl cat "$unit" >/dev/null 2>&1; then
    systemctl is-active "$unit" || true
    printf '%s: vorhanden\n' "$unit"
  else
    printf '%s: nicht installiert\n' "$unit"
  fi
done

printf '\n=== Datenbankstruktur (lesend) ===\n'
compose exec -T db sh -lc '
  MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --skip-column-names \
    -u"$MYSQL_USER" "$MYSQL_DATABASE" \
    -e "SHOW COLUMNS FROM users WHERE Field IN (\"id\", \"email\", \"role\", \"roleStatus\", \"loginMethod\", \"passwordHash\"); SHOW TABLES LIKE \"__drizzle_migrations\";"
'

if [[ -n "$account_email" ]]; then
  [[ "$account_email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || {
    printf 'Ungültige E-Mail-Adresse. Kontoprüfung abgebrochen.\n' >&2
    exit 2
  }

  printf '\n=== Kontoabgleich (lesend, ohne Zugangsdaten) ===\n'
  compose exec -T -e "ACCOUNT_EMAIL=$account_email" db sh -lc '
    MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --skip-column-names \
      -u"$MYSQL_USER" "$MYSQL_DATABASE" \
      -e "SELECT id, email, role, roleStatus, loginMethod, CASE WHEN passwordHash IS NULL OR passwordHash = \"\" THEN \"nein\" ELSE \"ja\" END AS passwort_hinterlegt FROM users WHERE LOWER(email) = LOWER(\"$ACCOUNT_EMAIL\") ORDER BY id;"
  '
fi

printf '\nPrüfung beendet. Es wurden keine Änderungen vorgenommen.\n'
