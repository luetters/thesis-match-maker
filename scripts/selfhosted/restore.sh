#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/.env"
BACKUP_DIR="${1:-}"

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Verwendung: $0 /vollstaendiger/pfad/zum/backup-ordner" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" || ! -f "$BACKUP_DIR/database.sql.gz" || ! -f "$BACKUP_DIR/storage-local.tar.gz" ]]; then
  echo "Fehler: .env, database.sql.gz oder storage-local.tar.gz fehlen." >&2
  exit 1
fi

read -r -p "ACHTUNG: Die Ziel-Datenbank und der lokale Dateispeicher werden überschrieben. Geben Sie RESTORE ein: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Abgebrochen."
  exit 0
fi

echo "[1/4] Starte Datenbankdienst …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db
sleep 10

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

echo "[2/4] Spiele Datenbankdump ein …"
gunzip -c "$BACKUP_DIR/database.sql.gz" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"

echo "[3/4] Starte Anwendung und spiele lokalen Dateispeicher ein …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d app
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app sh -c 'rm -rf /app/storage-data/* && mkdir -p /app/storage-data'
cat "$BACKUP_DIR/storage-local.tar.gz" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app tar -C /app/storage-data -xzf -

echo "[4/4] Starte den vollständigen Stack …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
echo "Wiederherstellung abgeschlossen. Prüfen Sie danach Anmeldung, Upload, E-Mail-Test und die Seite /faq."
