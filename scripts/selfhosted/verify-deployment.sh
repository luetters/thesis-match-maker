#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE fehlt." >&2
  exit 1
fi

echo "[1/4] Prüfe die aufgelöste Compose-Konfiguration …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
echo "[2/4] Prüfe den Gesundheitszustand der Container …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
echo "[3/4] Prüfe die lokale Webantwort …"
curl --fail --silent --show-error http://127.0.0.1/ >/dev/null
echo "[4/4] Prüfe die öffentlich konfigurierte HTTPS-Antwort …"
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a
curl --fail --silent --show-error "https://$SITE_DOMAIN/" >/dev/null
echo "Bereitstellungsprüfung erfolgreich. Prüfen Sie zusätzlich Anmeldung, Passwort-Reset, Upload, E-Mail-Versand und eine geschützte Prüfungsakte manuell."
