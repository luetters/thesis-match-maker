#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/../Thesis-Match-Maker-Uebergabe}"
ARCHIVE="$OUTPUT_DIR/thesis-match-maker-source-$(date -u +%Y%m%dT%H%M%SZ).zip"

mkdir -p "$OUTPUT_DIR"
cd "$ROOT_DIR"

zip -r "$ARCHIVE" . \
  -x 'node_modules/*' '.git/*' '.manus/*' '.manus-logs/*' '.env' '.env.*' 'deploy/.env' \
     'dist/*' 'backups/*' '*.log' 'storage-data/*' 'exit-package/*' 'Thesis-Match-Maker-Uebergabe/*'

echo "Quellarchiv erstellt: $ARCHIVE"
echo "Dieses Archiv enthält bewusst keine Produktivdaten, Uploads oder echten Geheimnisse."
