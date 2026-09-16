#!/usr/bin/env bash
# Root-auszuführender Helfer: ändert in deploy/.env ausschließlich den nicht
# geheimen unveränderlichen THESIS_MATCH_IMAGE-Wert.
set -Eeuo pipefail

readonly APP_DIR="${APP_DIR:-/opt/thesis-match-maker}"
readonly ENV_FILE="$APP_DIR/deploy/.env"
readonly image_ref="${1:-}"

fail() { printf '[thesis-match-maker-image] FEHLER: %s\n' "$*" >&2; exit 1; }

[[ "$EUID" -eq 0 ]] || fail "Bitte mit sudo oder als root ausführen."
[[ -f "$ENV_FILE" ]] || fail "Geschützte Konfiguration fehlt: $ENV_FILE"
[[ "$image_ref" =~ ^[A-Za-z0-9][A-Za-z0-9./:_-]*:[A-Fa-f0-9]{7,128}$ ]] || fail "Image-Referenz muss ein unveränderliches Commit-Tag enthalten."

temporary_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
trap 'rm -f "$temporary_file"' EXIT

awk -v replacement="THESIS_MATCH_IMAGE=$image_ref" '
  BEGIN { replaced = 0 }
  /^[[:space:]]*THESIS_MATCH_IMAGE=/ { print replacement; replaced = 1; next }
  { print }
  END { if (!replaced) exit 42 }
' "$ENV_FILE" > "$temporary_file" || {
  status=$?
  [[ "$status" -eq 42 ]] && fail "THESIS_MATCH_IMAGE fehlt in deploy/.env."
  exit "$status"
}

install -o root -g root -m 600 "$temporary_file" "$ENV_FILE"
printf '[thesis-match-maker-image] Image-Referenz aktualisiert.\n'
