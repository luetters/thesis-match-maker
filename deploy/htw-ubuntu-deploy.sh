#!/usr/bin/env bash
# Thesis Match Maker – kontrollierte Bereitstellung auf einem Ubuntu-Server der HTW Berlin.
# Dieses Skript verändert weder DNS noch Firewallregeln und gibt keine Geheimnisse aus.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/thesis-match-maker}"
readonly COMPOSE_FILE="$APP_DIR/deploy/docker-compose.yml"
readonly ENV_FILE="$APP_DIR/deploy/.env"
readonly HEALTH_URL="http://127.0.0.1:3000/"
INITIALIZE_EMPTY_DATABASE=false

log() {
  printf '[thesis-match-maker] %s\n' "$*"
}

fail() {
  log "FEHLER: $*"
  exit 1
}

usage() {
  cat <<'EOF'
Verwendung:
  sudo deploy/htw-ubuntu-deploy.sh
  sudo deploy/htw-ubuntu-deploy.sh --initialize-empty-database --confirm-empty-database

Ohne Optionen wird eine vorhandene Datenbank beibehalten und nur die Anwendung
kontrolliert gebaut sowie gestartet. Die Initialisierung ist ausschließlich für
eine nachweislich leere Ziel-Datenbank vorgesehen.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --initialize-empty-database)
      INITIALIZE_EMPTY_DATABASE=true
      ;;
    --confirm-empty-database)
      CONFIRM_EMPTY_DATABASE=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unbekannte Option: $1"
      ;;
  esac
  shift
done

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit sudo oder als root ausführen."
[[ -d "$APP_DIR" ]] || fail "Projektordner fehlt: $APP_DIR"
[[ -f "$COMPOSE_FILE" ]] || fail "Containerdefinition fehlt: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Geschützte Konfiguration fehlt: $ENV_FILE"
[[ -f "$APP_DIR/deploy/Caddyfile" ]] || fail "Reverse-Proxy-Konfiguration fehlt."
[[ -f "$APP_DIR/deploy/Dockerfile" ]] || fail "Produktions-Dockerfile fehlt."
[[ -f "$APP_DIR/vendor/xlsx-0.20.3.tgz" ]] || fail "Vendorte Sicherheitsabhängigkeit fehlt. Bitte das vollständige Releasearchiv verwenden."
command -v docker >/dev/null 2>&1 || fail "Docker Engine ist nicht installiert."
docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin ist nicht verfügbar."

if [[ "$INITIALIZE_EMPTY_DATABASE" == true && "${CONFIRM_EMPTY_DATABASE:-false}" != true ]]; then
  fail "Die Schema-Initialisierung erfordert zusätzlich --confirm-empty-database."
fi

if [[ "$(stat -c '%a' "$ENV_FILE")" != "600" ]]; then
  log "Schütze deploy/.env mit Dateirechten 600."
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

required_values=(
  SITE_DOMAIN CADDY_EMAIL
  MYSQL_ROOT_PASSWORD MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD
  JWT_SECRET CRON_SECRET TWO_FACTOR_ENCRYPTION_KEY TRANSFER_IMPORT_TOKEN
  SMTP_HOST SMTP_USER SMTP_PASS SMTP_FROM
)

for key in "${required_values[@]}"; do
  value="$(awk -F= -v expected="$key" '$0 !~ /^[[:space:]]*#/ && $1 == expected { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE")"
  [[ -n "$value" ]] || fail "Pflichtwert $key ist in deploy/.env nicht gesetzt."
  [[ "$value" != *"CHANGE_ME"* && "$value" != *"example.org"* ]] || fail "Pflichtwert $key enthält noch einen Platzhalter."
done

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q

if [[ "$INITIALIZE_EMPTY_DATABASE" == true ]]; then
  log "Starte die leere Datenbank für die bestätigte Schema-Initialisierung."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db
  "$APP_DIR/scripts/selfhosted/bootstrap-schema.sh"
fi

log "Baue und starte Anwendung, Datenbank und Reverse Proxy."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

for attempt in $(seq 1 24); do
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null; then
    log "Lokaler Health-Check erfolgreich."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    log "Bereitstellung abgeschlossen. Der externe TLS-Test erfolgt erst, wenn DNS und die Ports 80/443 durch die zuständige HTW-Berlin-Administration freigegeben sind."
    exit 0
  fi
  log "Anwendung noch nicht bereit (Versuch $attempt/24)."
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2 || true
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=150 app caddy >&2 || true
fail "Lokaler Health-Check nach zwei Minuten fehlgeschlagen. Es wurden keine Daten gelöscht."
