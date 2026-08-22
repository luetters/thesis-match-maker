#!/usr/bin/env bash
set -euo pipefail

# Importiert ein portables Transferarchiv ausschließlich über den lokalen
# Loopback-Port in eine leere Zielumgebung. Das Archiv wird nicht entpackt.

PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
ARCHIVE_PATH="${1:-}"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/deploy/.env"
REQUEST_SCRIPT="$PROJECT_DIR/scripts/selfhosted/bootstrap-portable-request.mjs"

if [[ -z "$ARCHIVE_PATH" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "Verwendung: $0 /pfad/zum/thesis-transfer.zip" >&2
  exit 64
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Die Datei deploy/.env fehlt." >&2
  exit 65
fi
if [[ ! -f "$REQUEST_SCRIPT" ]]; then
  echo "Lokales Bootstrap-Anfrageskript fehlt: $REQUEST_SCRIPT" >&2
  exit 65
fi

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

# Der Schlüssel wird gezielt gelesen; die gesamte Umgebungsdatei wird nie als
# Shell-Code ausgeführt.
TRANSFER_IMPORT_TOKEN="$(read_transfer_import_token)"
if [[ -z "$TRANSFER_IMPORT_TOKEN" || "$TRANSFER_IMPORT_TOKEN" == "CHANGE_ME" || "$TRANSFER_IMPORT_TOKEN" == "change_me" ]]; then
  echo "TRANSFER_IMPORT_TOKEN muss vor dem Bootstrap-Import gesetzt werden." >&2
  exit 66
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d app

for _ in {1..30}; do
  if curl --silent --fail http://127.0.0.1:3000/ >/dev/null; then break; fi
  sleep 2
done

# Siehe auch das Vorschau-Skript: Die Anfrage wird im App-Container über
# Loopback gesendet. Dadurch bleibt der Bootstrap-Endpunkt öffentlich gesperrt.
CONTAINER_ID="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q app)"
if [[ -z "$CONTAINER_ID" ]]; then
  echo "App-Container nicht gefunden." >&2
  exit 70
fi
CONTAINER_ARCHIVE="/tmp/bootstrap-import-${RANDOM}-${RANDOM}.zip"
CONTAINER_REQUEST="/tmp/bootstrap-request-${RANDOM}-${RANDOM}.mjs"
cleanup() {
  docker exec -u 0 "$CONTAINER_ID" rm -f "$CONTAINER_ARCHIVE" "$CONTAINER_REQUEST" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker cp "$ARCHIVE_PATH" "$CONTAINER_ID:$CONTAINER_ARCHIVE"
docker cp "$REQUEST_SCRIPT" "$CONTAINER_ID:$CONTAINER_REQUEST"
docker exec "$CONTAINER_ID" node "$CONTAINER_REQUEST" import "$CONTAINER_ARCHIVE"
