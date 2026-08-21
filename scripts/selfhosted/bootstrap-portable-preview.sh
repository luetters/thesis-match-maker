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

TOKEN="$(grep -E '^TRANSFER_IMPORT_TOKEN=' "$ENV_FILE" | cut -d= -f2-)"
[[ -n "$TOKEN" && "$TOKEN" != "change_me" ]] || { echo "TRANSFER_IMPORT_TOKEN ist nicht gesetzt." >&2; exit 78; }

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
