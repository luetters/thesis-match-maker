#!/usr/bin/env bash
# Einmalige Vorbereitung eines Ubuntu-Servers für den kontrollierten GitHub-Actions-Deploy.
# Das Skript schreibt keine Geheimnisse und führt keinen automatischen Datenimport aus.
set -Eeuo pipefail

readonly DEFAULT_APP_DIR="/opt/thesis-match-maker"
APP_DIR="$DEFAULT_APP_DIR"
REPOSITORY_URL=""
BRANCH="main"
ACTIONS_PUBLIC_KEY=""
START_AFTER_SETUP=false

log() {
  printf '[thesis-github-bootstrap] %s\n' "$*"
}

fail() {
  log "FEHLER: $*"
  exit 1
}

usage() {
  cat <<'EOF'
Verwendung:
  sudo deploy/github-ubuntu-bootstrap.sh \
    --repository-url git@github.com:ORGANISATION/REPOSITORY.git \
    --actions-public-key /sicherer/pfad/github-actions-deploy.pub

Optionen:
  --branch NAME       Git-Branch für die Erstinstallation (Standard: main)
  --app-dir PFAD      Zielordner (Standard: /opt/thesis-match-maker)
  --start             Anwendung nach vollständiger Konfiguration starten

Voraussetzungen:
  * Docker Engine, Docker Compose Plugin, Git, unzip, rsync und curl sind installiert.
  * Der Server kann das private GitHub-Repository lesend erreichen.
  * Die Datei mit dem GitHub-Actions-Public-Key enthält genau einen Ed25519-Schlüssel.
  * Die geschützte Datei deploy/.env wird nach der Codeübernahme manuell anhand
    von deploy/environment.example befüllt; Geheimnisse gehören niemals in Git.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repository-url)
      REPOSITORY_URL="${2:-}"
      shift 2
      ;;
    --actions-public-key)
      ACTIONS_PUBLIC_KEY="${2:-}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      shift 2
      ;;
    --app-dir)
      APP_DIR="${2:-}"
      shift 2
      ;;
    --start)
      START_AFTER_SETUP=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unbekannte Option: $1"
      ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || fail "Bitte mit sudo oder als root ausführen."
[[ -n "$REPOSITORY_URL" ]] || fail "--repository-url fehlt."
[[ "$BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || fail "Ungültiger Branchname."
[[ -f "$ACTIONS_PUBLIC_KEY" ]] || fail "Die GitHub-Actions-Public-Key-Datei fehlt."

for command in docker git unzip rsync curl; do
  command -v "$command" >/dev/null 2>&1 || fail "Fehlende Voraussetzung: $command"
done
docker compose version >/dev/null 2>&1 || fail "Docker Compose Plugin ist nicht verfügbar."

public_key="$(tr -d '\r\n' < "$ACTIONS_PUBLIC_KEY")"
[[ "$public_key" =~ ^ssh-ed25519[[:space:]] ]] || fail "Nur Ed25519-Public-Keys sind zulässig."

if [[ -e "$APP_DIR" && -n "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
  fail "Der Zielordner ist nicht leer: $APP_DIR. Kein bestehender Betrieb wird überschrieben."
fi

staging_dir="$(mktemp -d)"
trap 'rm -rf "$staging_dir"' EXIT

log "Übernehme den Branch $BRANCH in eine temporäre, prüfbare Arbeitskopie."
git clone --depth 1 --branch "$BRANCH" "$REPOSITORY_URL" "$staging_dir/source"

for required_file in \
  deploy/docker-compose.yml \
  deploy/htw-ubuntu-deploy.sh \
  scripts/selfhosted/setup-thesis-deploy-user.sh \
  vendor/xlsx-0.20.3.tgz; do
  [[ -f "$staging_dir/source/$required_file" ]] || fail "Die Arbeitskopie enthält $required_file nicht."
done

install -d -o root -g root -m 755 "$APP_DIR"
rsync -a --delete "$staging_dir/source/" "$APP_DIR/"
install -d -o root -g root -m 700 "$APP_DIR/deploy"

if [[ ! -f "$APP_DIR/deploy/.env" ]]; then
  install -o root -g root -m 600 /dev/null "$APP_DIR/deploy/.env"
  log "Leere, geschützte deploy/.env angelegt. Bitte sie anhand von deploy/environment.example befüllen."
fi

"$APP_DIR/scripts/selfhosted/setup-thesis-deploy-user.sh" "$ACTIONS_PUBLIC_KEY"

if [[ "$START_AFTER_SETUP" == true ]]; then
  [[ -s "$APP_DIR/deploy/.env" ]] || fail "deploy/.env ist leer. Der Start wurde deshalb nicht ausgeführt."
  "$APP_DIR/deploy/htw-ubuntu-deploy.sh"
else
  log "Serverzugang ist vorbereitet. Befüllen Sie jetzt deploy/.env und starten Sie danach:"
  log "  sudo $APP_DIR/deploy/htw-ubuntu-deploy.sh"
fi
