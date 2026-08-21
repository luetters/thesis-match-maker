#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/deploy/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/.env"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${1:-$ROOT_DIR/backups/$STAMP}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fehler: $ENV_FILE fehlt. Kopieren Sie zuerst deploy/.env.example nach deploy/.env." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
echo "[1/3] Erzeuge konsistenten MySQL-Dump in $BACKUP_DIR/database.sql.gz …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF \
  -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" | gzip -9 > "$BACKUP_DIR/database.sql.gz"

echo "[2/3] Sichere den lokalen Dateispeicher …"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app \
  sh -c 'tar -C /app/storage-data -czf - .' > "$BACKUP_DIR/storage-local.tar.gz"

if [[ -n "${S3_ENDPOINT:-}" && -n "${S3_BUCKET:-}" && -n "${S3_ACCESS_KEY:-}" && -n "${S3_SECRET_KEY:-}" ]]; then
  echo "[3/3] S3-Bucket wird mit einem temporären AWS-CLI-Container gesichert …"
  mkdir -p "$BACKUP_DIR/s3"
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
    -e AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}" \
    -v "$BACKUP_DIR/s3:/backup" \
    amazon/aws-cli:2 \
    --endpoint-url "$S3_ENDPOINT" s3 sync "s3://$S3_BUCKET" /backup
else
  echo "[3/3] Kein S3 konfiguriert; lokaler Dateispeicher ist bereits gesichert."
fi

find "$BACKUP_DIR" -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > "$BACKUP_DIR/SHA256SUMS"
printf 'createdAt=%s\nsource=%s\n' "$STAMP" "thesis-match-maker" > "$BACKUP_DIR/manifest.txt"
echo "Fertig. Prüfen Sie $BACKUP_DIR/SHA256SUMS und kopieren Sie den gesamten Ordner verschlüsselt an einen zweiten Ort."
