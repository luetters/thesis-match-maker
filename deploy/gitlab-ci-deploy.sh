#!/usr/bin/env sh
# Läuft ausschließlich in der geschützten GitLab-CI/CD-Pipeline.
# Erwartet Datei-Variablen für SSH-Schlüssel und bekannte Hostschlüssel.
set -eu

required_vars="CI_REGISTRY DEPLOY_REGISTRY_USER DEPLOY_REGISTRY_TOKEN DEPLOY_TARGET DEPLOY_APP_DIR IMAGE_REF"
for variable in $required_vars; do
  eval "value=\${$variable:-}"
  [ -n "$value" ] || { printf 'Fehlende geschützte CI/CD-Variable: %s\n' "$variable" >&2; exit 1; }
done

case "$IMAGE_REF" in
  *":latest"*|*" "*|*".."*) printf 'Ungültige oder veränderliche Image-Referenz.\n' >&2; exit 1 ;;
esac

# Das zeitlich begrenzte Registry-Token wird nur per Standard-Eingabe an Docker
# übergeben und weder ausgegeben noch als Datei im Repository abgelegt.
printf '%s' "$DEPLOY_REGISTRY_TOKEN" | ssh "$DEPLOY_TARGET" \
  "sudo /usr/bin/docker login '$CI_REGISTRY' --username '$DEPLOY_REGISTRY_USER' --password-stdin"

ssh "$DEPLOY_TARGET" \
  "sudo '$DEPLOY_APP_DIR/deploy/update-image-reference.sh' '$IMAGE_REF' && sudo '$DEPLOY_APP_DIR/deploy/htw-ubuntu-image-deploy.sh'"
