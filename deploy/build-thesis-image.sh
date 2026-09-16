#!/usr/bin/env bash
# Erstellt ein signier- bzw. übertragbares Produktionsimage ohne Geheimnisse.
set -Eeuo pipefail

IMAGE=""
ARCHIVE=""
PUSH=false
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Verwendung:
  deploy/build-thesis-image.sh --image registry.htw-berlin.de/thesis/thesis-match-maker:2026-09-16 [--push]
  deploy/build-thesis-image.sh --image thesis-match-maker:2026-09-16 --archive /sicherer/uebergabeort/thesis-match-maker.tar

Das Image enthält weder deploy/.env noch Datenbank- oder Dateispeicherinhalte.
Ein Tag muss unveränderlich sein (Datum, Release-ID oder Git-Commit); "latest" ist
für den Produktivbetrieb nicht vorgesehen.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image) IMAGE="${2:-}"; shift 2 ;;
    --archive) ARCHIVE="${2:-}"; shift 2 ;;
    --push) PUSH=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unbekannte Option: %s\n' "$1" >&2; usage; exit 64 ;;
  esac
done

[[ -n "$IMAGE" ]] || { usage; exit 64; }
[[ "$IMAGE" != *$'\n'* && "$IMAGE" != *$'\r'* ]] || { echo "Ungültiger Image-Name." >&2; exit 64; }
[[ "$IMAGE" != *":latest" ]] || { echo "Das bewegliche Tag :latest ist für Produktivdeploys nicht zulässig." >&2; exit 64; }
[[ -f "$PROJECT_DIR/deploy/Dockerfile" ]] || { echo "Produktions-Dockerfile fehlt." >&2; exit 65; }
[[ -f "$PROJECT_DIR/vendor/xlsx-0.20.3.tgz" ]] || { echo "Vendorte Sicherheitsabhängigkeit fehlt." >&2; exit 65; }
command -v docker >/dev/null 2>&1 || { echo "Docker ist nicht verfügbar." >&2; exit 69; }

cd "$PROJECT_DIR"
docker build --pull --file deploy/Dockerfile --tag "$IMAGE" .

if [[ -n "$ARCHIVE" ]]; then
  install -d -m 0750 "$(dirname "$ARCHIVE")"
  docker image save "$IMAGE" --output "$ARCHIVE"
  sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
  printf 'Imagearchiv erstellt: %s\nPrüfsumme: %s.sha256\n' "$ARCHIVE" "$ARCHIVE"
fi

if [[ "$PUSH" == true ]]; then
  docker image push "$IMAGE"
fi

printf 'Image bereit: %s\n' "$IMAGE"
