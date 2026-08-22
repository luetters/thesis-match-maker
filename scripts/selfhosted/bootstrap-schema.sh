#!/usr/bin/env bash
set -euo pipefail

# Erstellt ausschließlich die leere Schema-Struktur der Ziel-Datenbank. Dieses
# Skript importiert weder Transferdaten noch Dateien und ist vor der
# Bootstrap-Vorschau auf einer frischen Zielumgebung auszuführen.

PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
ENV_FILE="$PROJECT_DIR/deploy/.env"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"

[[ -f "$ENV_FILE" ]] || { echo "Die Datei deploy/.env fehlt." >&2; exit 65; }

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build app

for _ in {1..30}; do
  if curl --silent --fail http://127.0.0.1:3000/ >/dev/null; then break; fi
  sleep 2
done

CONTAINER_ID="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q app)"
[[ -n "$CONTAINER_ID" ]] || { echo "App-Container nicht gefunden." >&2; exit 70; }

docker exec "$CONTAINER_ID" ./node_modules/.bin/drizzle-kit migrate --config=/app/drizzle.config.ts
echo "Datenbankstruktur ist bereit. Es wurden keine Portal- oder Transferdaten importiert."
