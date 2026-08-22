#!/usr/bin/env bash
set -euo pipefail

# Ausschließlich für eine neue, ausdrücklich leere Zielumgebung.
# Der Schritt entfernt lokale Docker-Volumes und erzeugt die heutige, geprüfte
# Datenstruktur direkt aus drizzle/schema.ts. Transferdaten werden nicht gelesen.

PROJECT_DIR="${PROJECT_DIR:-/opt/thesis-match-maker}"
ENV_FILE="$PROJECT_DIR/deploy/.env"
COMPOSE_FILE="$PROJECT_DIR/deploy/docker-compose.yml"
CONFIRMATION="${1:-}"

[[ "$CONFIRMATION" == "--confirm-empty-target-reset" ]] || {
  echo "Abbruch: Nur mit --confirm-empty-target-reset für eine nachweislich leere Zielumgebung ausführen." >&2
  exit 64
}
[[ -f "$ENV_FILE" ]] || { echo "Die Datei deploy/.env fehlt." >&2; exit 65; }

cd "$PROJECT_DIR"
echo "Leere Zielstruktur wird zurückgesetzt. Transferarchive in /tmp bleiben unberührt."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v --remove-orphans
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build db

for _ in {1..45}; do
  DB_STATE="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format json db 2>/dev/null || true)"
  if grep -q 'healthy' <<<"$DB_STATE"; then break; fi
  sleep 2
done
grep -q 'healthy' <<<"${DB_STATE:-}" || { echo "Datenbankcontainer wurde nicht gesund." >&2; exit 70; }

# Der Datenbankcontainer ist neu. push erzeugt daher die aktuelle Struktur ohne
# historische Migrationsschritte und ohne vorhandene Daten anzutasten.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build app
PUSH_OUTPUT="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps app \
  ./node_modules/.bin/drizzle-kit push --config=/app/drizzle.config.ts --force 2>&1)" || {
  printf '%s\n' "$PUSH_OUTPUT" >&2
  echo "Schema-Initialisierung durch Drizzle fehlgeschlagen." >&2
  exit 71
}
printf '%s\n' "$PUSH_OUTPUT"
if grep -q '^Error:' <<<"$PUSH_OUTPUT"; then
  echo "Schema-Initialisierung durch Drizzle fehlgeschlagen." >&2
  exit 71
fi

USERS_TABLE="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db sh -lc \
  'mysql -N -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '\''users'\'';"')"
[[ "$USERS_TABLE" == "users" ]] || {
  echo "Schema-Initialisierung unvollständig: Tabelle users wurde nicht erzeugt." >&2
  exit 70
}

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build app
echo "Aktuelle leere Datenstruktur ist bereit. Es wurden keine Transferdaten importiert."
