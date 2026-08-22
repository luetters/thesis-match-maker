#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Aufruf: $0 /pfad/zum/thesis-transfer.zip" >&2
  exit 64
fi

ARCHIVE="$1"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_DIR/deploy/.env"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"

[[ -f "$ARCHIVE" ]] || { echo "Transferarchiv nicht gefunden: $ARCHIVE" >&2; exit 66; }
[[ -f "$ENV_FILE" ]] || { echo "Konfiguration fehlt: $ENV_FILE" >&2; exit 78; }

# Die Konfiguration genauso laden wie der finale Bootstrap-Import. Dadurch
# funktionieren korrekt gequotete Werte und Windows-Zeilenenden konsistent
# mit Docker Compose und dem Importskript.
source "$ENV_FILE"
TOKEN="${TRANSFER_IMPORT_TOKEN:-}"
TOKEN="${TOKEN//$'\r'/}"
[[ -n "$TOKEN" && "$TOKEN" != "change_me" && "$TOKEN" != "CHANGE_ME" ]] || { echo "TRANSFER_IMPORT_TOKEN ist nicht gesetzt." >&2; exit 78; }

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build app

for _ in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3000/ >/dev/null; then
    break
  fi
  sleep 2
done

curl --fail --silent --show-error \
  -H "X-Thesis-Transfer-Token: $TOKEN" \
  -H "X-Thesis-Transfer-Confirmation: BOOTSTRAP_PREVIEW" \
  -F "archive=@$ARCHIVE;type=application/zip" \
  http://127.0.0.1:3000/api/bootstrap/portable-transfer/preview
echo
