#!/usr/bin/env bash
# Einmaliges Root-Setup eines eingeschränkten GitHub-unabhängigen Deploy-Benutzers.
set -Eeuo pipefail

readonly APP_DIR="/opt/thesis-match-maker"
readonly DEPLOY_USER="thesis-deploy"
readonly DEPLOY_HOME="/var/lib/thesis-deploy"

if [[ "${EUID}" -ne 0 ]]; then
  printf '%s\n' 'Dieses Setup muss als root ausgeführt werden.' >&2
  exit 1
fi

KEY_FILE="${1:-}"
if [[ -z "$KEY_FILE" || ! -f "$KEY_FILE" ]]; then
  printf '%s\n' 'Bitte den Pfad zu einer öffentlichen SSH-Schlüsseldatei angeben.' >&2
  exit 1
fi

PUBLIC_KEY="$(tr -d '\r\n' < "$KEY_FILE")"
if [[ ! "$PUBLIC_KEY" =~ ^ssh-ed25519[[:space:]] ]]; then
  printf '%s\n' 'Nur Ed25519-SSH-Public-Keys sind zulässig.' >&2
  exit 1
fi

id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --system --home-dir "$DEPLOY_HOME" --create-home --shell /bin/bash "$DEPLOY_USER"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 750 "$DEPLOY_HOME/incoming" "$DEPLOY_HOME/releases" "$DEPLOY_HOME/.ssh"
install -o root -g root -m 750 "$APP_DIR/scripts/selfhosted/thesis-deploy" /usr/local/sbin/thesis-deploy
install -o root -g root -m 755 "$APP_DIR/scripts/selfhosted/thesis-deploy-gateway" /usr/local/libexec/thesis-deploy-gateway

printf 'restrict,command="/usr/local/libexec/thesis-deploy-gateway" %s\n' "$PUBLIC_KEY" > "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"

cat > /etc/sudoers.d/thesis-deploy <<'SUDOERS'
thesis-deploy ALL=(root) NOPASSWD: /usr/local/sbin/thesis-deploy deploy, /usr/local/sbin/thesis-deploy health, /usr/local/sbin/thesis-deploy rollback *
SUDOERS
chmod 440 /etc/sudoers.d/thesis-deploy
visudo -cf /etc/sudoers.d/thesis-deploy >/dev/null

printf '%s\n' 'Eingeschränkter Deploy-Zugang eingerichtet. Erlaubt sind nur Upload, deploy, health und rollback.'
