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

read_transfer_import_token() {
  local value first last
  value="$(grep -m1 -E '^TRANSFER_IMPORT_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ ${#value} -ge 2 ]]; then
    first="${value:0:1}"
    last="${value: -1}"
    if [[ ( "$first" == "\"" && "$last" == "\"" ) || ( "$first" == "'" && "$last" == "'" ) ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf '%s' "$value"
}

# Keine Auswertung der vollständigen .env-Datei: einzelne Konfigurationswerte
# können Shell-fremde Zeichen enthalten. Nur der benötigte Schlüssel wird als
# Klartext gelesen; Anführungszeichen und Windows-Zeilenenden werden behandelt.
TOKEN="$(read_transfer_import_token)"
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
