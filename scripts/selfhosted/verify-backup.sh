#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${1:-}"

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Verwendung: $0 /vollstaendiger/pfad/zum/backup-ordner" >&2
  exit 1
fi

for required in database.sql.gz storage-local.tar.gz SHA256SUMS manifest.txt; do
  if [[ ! -f "$BACKUP_DIR/$required" ]]; then
    echo "Fehler: $required fehlt in $BACKUP_DIR." >&2
    exit 1
  fi
done

echo "[1/3] Prüfe Prüfsummen …"
(cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS)
echo "[2/3] Prüfe, ob der SQL-Dump lesbar ist …"
gunzip -t "$BACKUP_DIR/database.sql.gz"
echo "[3/3] Prüfe, ob das Storage-Archiv lesbar ist …"
tar -tzf "$BACKUP_DIR/storage-local.tar.gz" >/dev/null
echo "Backup ist strukturell lesbar. Ein vollständiger Restore-Test auf einem getrennten Testserver bleibt erforderlich."
