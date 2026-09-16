#!/usr/bin/env bash
# Kontrollierter HTW-Berlin-Produktionsdeploy aus einer privaten Container-Registry.
# Das Skript verändert weder DNS noch Firewallregeln und gibt keine Geheimwerte aus.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/thesis-match-maker}"
readonly COMPOSE_FILE="$APP_DIR/deploy/docker-compose.image.yml"
readonly ENV_FILE="$APP_DIR/deploy/.env"
readonly HEALTH_URL="http://127.0.0.1:3000/"
INITIALIZE_EMPTY_DATABASE=false
CONFIRM_EMPTY_DATABASE=false

log() { printf '[thesis-match-maker-image] %s\n' "$*"; }
fail() { log "FEHLER: $*"; exit 1; }

usage() {
  cat <<'EOF'
Verwendung:
  sudo deploy/htw-ubuntu-image-deploy.sh
  sudo deploy/htw-ubuntu-image-deploy.sh --initialize-empty-database --confirm-empty-database

Die Initialisierung ist ausschließlich für eine nachweislich leere Datenbank zulässig.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --initialize-empty-database) INITIALIZE_EMPTY_DATABASE=true ;;
    --confirm-empty-database) CONFIRM_EMPTY_DATABASE=true ;;
    --help|-h) usage; exit 0 ;;
    *) fail "Unbekannte Option: $1" ;;
  esac
  shift
done

[[ "$EUID" -eq 0 ]] || fail "Bitte mit sudo oder als root ausführen."
[[ -d "$APP_DIR" ]] || fail "Projektordner fehlt: $APP_DIR"
[[ -f "$COMPOSE_FILE" ]] || fail "Image-Compose-Datei fehlt: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Geschützte Konfiguration fehlt: $ENV_FILE"
command -v docker >/dev/null 2>&1 || fail "Docker Engine ist nicht installiert."
docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin ist nicht verfügbar."

if [[ "$INITIALIZE_EMPTY_DATABASE" == true && "$CONFIRM_EMPTY_DATABASE" != true ]]; then
  fail "Die Schema-Initialisierung erfordert zusätzlich --confirm-empty-database."
fi

if [[ "$(stat -c '%a' "$ENV_FILE")" != "600" ]]; then
  log "Schütze deploy/.env mit Dateirechten 600."
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

image_ref="$(awk -F= '$0 !~ /^[[:space:]]*#/ && $1 == "THESIS_MATCH_IMAGE" { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE")"
[[ -n "$image_ref" ]] || fail "THESIS_MATCH_IMAGE ist in deploy/.env nicht gesetzt."
[[ "$image_ref" != *"CHANGE_ME"* && "$image_ref" != *":latest" ]] || fail "THESIS_MATCH_IMAGE muss ein geprüftes, unveränderliches Image-Tag sein."

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q
log "Ziehe das geprüfte Anwendungsimage."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull app

if [[ "$INITIALIZE_EMPTY_DATABASE" == true ]]; then
  log "Starte die leere Datenbank für die bestätigte Schema-Initialisierung."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db
  for _ in $(seq 1 30); do
    if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status running db | grep -q db; then break; fi
    sleep 2
  done
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps app ./node_modules/.bin/drizzle-kit migrate --config=/app/drizzle.config.ts
fi

log "Starte Anwendung, Datenbank und Reverse Proxy aus dem Image."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

for attempt in $(seq 1 24); do
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    log "Image-Deploy erfolgreich. Der externe TLS-Test erfolgt erst nach DNS- und Portfreigabe durch die HTW-Berlin-Administration."
    exit 0
  fi
  log "Anwendung noch nicht bereit (Versuch $attempt/24)."
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2 || true
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=150 app caddy >&2 || true
fail "Lokaler Health-Check nach zwei Minuten fehlgeschlagen. Es wurden keine Daten gelöscht."
