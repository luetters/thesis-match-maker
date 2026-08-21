#!/usr/bin/env bash
set -Eeuo pipefail

# Führt ausschließlich vorbereitende Prüfungen aus. Dieses Skript erzeugt keinen
# Datenbankdump, exportiert keine Dateien und überträgt keine Daten.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/.env"
REPORT_DIR="${1:-$ROOT_DIR/export-preflight}"
REPORT_FILE="$REPORT_DIR/export-preflight.txt"

failures=0
warn() { printf 'WARNUNG: %s\n' "$*" | tee -a "$REPORT_FILE"; }
fail() { printf 'FEHLER: %s\n' "$*" | tee -a "$REPORT_FILE"; failures=$((failures + 1)); }
pass() { printf 'OK: %s\n' "$*" | tee -a "$REPORT_FILE"; }

mkdir -p "$REPORT_DIR"
: > "$REPORT_FILE"
printf 'Exportvorprüfung Thesis Match Maker\nZeitpunkt (UTC): %s\n\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$REPORT_FILE"

for command in docker sha256sum gzip tar; do
  if command -v "$command" >/dev/null 2>&1; then
    pass "Werkzeug verfügbar: $command"
  else
    fail "Werkzeug fehlt: $command"
  fi
done

if [[ -f "$COMPOSE_FILE" ]]; then
  pass "Compose-Datei vorhanden"
else
  fail "Compose-Datei fehlt: $COMPOSE_FILE"
fi

if [[ -f "$ENV_FILE" ]]; then
  pass "Lokale Geheimnisdatei vorhanden (Inhalt wird nicht gelesen oder protokolliert)"
  for variable in SITE_DOMAIN MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD JWT_SECRET CRON_SECRET TWO_FACTOR_ENCRYPTION_KEY; do
    if grep -Eq "^${variable}=.+" "$ENV_FILE" && ! grep -Eq "^${variable}=.*(CHANGE_ME|BEISPIEL|EXAMPLE)" "$ENV_FILE"; then
      pass "Pflichtwert gesetzt: $variable"
    else
      fail "Pflichtwert fehlt oder ist Platzhalter: $variable"
    fi
  done
else
  warn "Keine deploy/.env-Datei vorhanden. Die Vorprüfung ist für den Zielserver bestimmt; deshalb ist dies vor dem Umzug erwartbar."
fi

if [[ -w "$ROOT_DIR" ]]; then
  pass "Projektordner beschreibbar für den späteren Backupordner"
else
  fail "Projektordner nicht beschreibbar: $ROOT_DIR"
fi

available_kib="$(df -Pk "$ROOT_DIR" | awk 'NR==2 {print $4}')"
if [[ "${available_kib:-0}" -ge 5242880 ]]; then
  pass "Mindestens 5 GiB freier Speicher für einen vorbereitenden Backupordner verfügbar"
else
  warn "Weniger als 5 GiB freier Speicher. Vor dem echten Export muss mindestens die doppelte Größe von Datenbank und Dateispeicher frei sein."
fi

if [[ "$failures" -gt 0 ]]; then
  printf '\nERGEBNIS: NICHT EXPORTBEREIT – %s blockierende Prüfung(en).\n' "$failures" | tee -a "$REPORT_FILE"
  exit 2
fi

printf '\nERGEBNIS: VORBEREITUNG ERFÜLLT – kein Export wurde ausgeführt.\n' | tee -a "$REPORT_FILE"
printf 'Nächster Schritt auf dem Zielserver: scripts/selfhosted/backup.sh /sicherer/pfad/zum/export\n' | tee -a "$REPORT_FILE"
