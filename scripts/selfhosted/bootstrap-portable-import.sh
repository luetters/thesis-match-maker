#!/usr/bin/env bash
set -euo pipefail

# Importiert ein portables Transferarchiv ausschließlich über den lokalen
# Loopback-Port in eine leere Zielumgebung. Das Archiv wird nicht entpackt.

PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
ARCHIVE_PATH="${1:-}"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/deploy/.env"

if [[ -z "$ARCHIVE_PATH" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "Verwendung: $0 /pfad/zum/thesis-transfer.zip" >&2
  exit 64
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Die Datei deploy/.env fehlt." >&2
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

curl --fail --silent --show-error \
  -H "X-Thesis-Transfer-Confirmation: BOOTSTRAP_IMPORT" \
  -H "X-Thesis-Transfer-Token: $TRANSFER_IMPORT_TOKEN" \
  -F "archive=@${ARCHIVE_PATH};type=application/zip" \
  http://127.0.0.1:3000/api/bootstrap/portable-transfer/import
echo
