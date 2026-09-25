#!/usr/bin/env bash
# Installiert ausschließlich die geprüften Werkzeuge für Schema-Reparatur,
# Nutzer-/Vorgangsreset und Superadmin-Erstzugang.
set -Eeuo pipefail

readonly APP_DIR="/opt/thesis-match-maker"
readonly TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ "$EUID" -eq 0 ]] || {
  printf 'Dieses Installationsskript muss mit sudo ausgeführt werden.\n' >&2
  exit 1
}

[[ -f "$APP_DIR/deploy/docker-compose.yml" && -f "$APP_DIR/deploy/.env" ]] || {
  printf 'Die bestehende Portalinstallation unter %s ist unvollständig. Keine Dateien wurden ersetzt.\n' "$APP_DIR" >&2
  exit 1
}

[[ -f "$TOOL_DIR/SHA256SUMS" ]] || {
  printf 'Die Prüfsummenliste fehlt. Keine Dateien wurden ersetzt.\n' >&2
  exit 1
}
(cd "$TOOL_DIR" && sha256sum -c SHA256SUMS)

for file in \
  deploy/Dockerfile \
  scripts/selfhosted/repair-auth-schema.sh \
  scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh \
  scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs \
  scripts/selfhosted/cleanup-user-storage.mjs \
  docs/Schema_Reparatur_HTW_Berlin.md \
  docs/Nutzer_und_Vorgangsreset_HTW_Berlin.md; do
  [[ -f "$TOOL_DIR/$file" ]] || {
    printf 'Im Werkzeugpaket fehlt %s. Keine Dateien wurden ersetzt.\n' "$file" >&2
    exit 1
  }
done

backup_dir="$APP_DIR/backups/reset-tools-install-$(date -u +%Y%m%dT%H%M%SZ)"
install -d -o root -g root -m 700 "$backup_dir"
for file in \
  deploy/Dockerfile \
  scripts/selfhosted/repair-auth-schema.sh \
  scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh \
  scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs \
  scripts/selfhosted/cleanup-user-storage.mjs; do
  if [[ -f "$APP_DIR/$file" ]]; then
    install -D -o root -g root -m 600 "$APP_DIR/$file" "$backup_dir/$file"
  fi
done

install -D -o root -g root -m 644 "$TOOL_DIR/deploy/Dockerfile" "$APP_DIR/deploy/Dockerfile"
install -D -o root -g root -m 750 "$TOOL_DIR/scripts/selfhosted/repair-auth-schema.sh" "$APP_DIR/scripts/selfhosted/repair-auth-schema.sh"
install -D -o root -g root -m 750 "$TOOL_DIR/scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh" "$APP_DIR/scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh"
install -D -o root -g root -m 644 "$TOOL_DIR/scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs" "$APP_DIR/scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs"
install -D -o root -g root -m 644 "$TOOL_DIR/scripts/selfhosted/cleanup-user-storage.mjs" "$APP_DIR/scripts/selfhosted/cleanup-user-storage.mjs"
install -D -o root -g root -m 644 "$TOOL_DIR/docs/Schema_Reparatur_HTW_Berlin.md" "$APP_DIR/docs/Schema_Reparatur_HTW_Berlin.md"
install -D -o root -g root -m 644 "$TOOL_DIR/docs/Nutzer_und_Vorgangsreset_HTW_Berlin.md" "$APP_DIR/docs/Nutzer_und_Vorgangsreset_HTW_Berlin.md"

cd "$APP_DIR"
docker compose --env-file deploy/.env -f deploy/docker-compose.yml build app
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --no-deps app

echo "Resetwerkzeuge installiert. Sicherung der ersetzten Werkzeugdateien: $backup_dir"
echo "Als Nächstes ausschließlich die Schema-Vorschau ausführen:"
echo "sudo /opt/thesis-match-maker/scripts/selfhosted/repair-auth-schema.sh --check"
