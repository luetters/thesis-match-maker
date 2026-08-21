#!/usr/bin/env bash
set -Eeuo pipefail

# Erzeugt auf dem Zielserver eine passwortgeschützte Kopie eines bereits
# geprüften Backupordners. Das Passwort wird interaktiv abgefragt und weder
# geschrieben noch geloggt.

BACKUP_DIR="${1:-}"
OUTPUT_FILE="${2:-}"

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo "Verwendung: $0 /vollstaendiger/pfad/zum/backup-ordner /sicherer/pfad/backup.tar.gz.enc" >&2
  exit 1
fi
if [[ -z "$OUTPUT_FILE" ]]; then
  echo "Fehler: Eine separate Zieldatei für die verschlüsselte Kopie ist erforderlich." >&2
  exit 1
fi
if [[ -e "$OUTPUT_FILE" ]]; then
  echo "Fehler: Zieldatei existiert bereits und wird nicht überschrieben." >&2
  exit 1
fi

for required in SHA256SUMS manifest.txt; do
  if [[ ! -f "$BACKUP_DIR/$required" ]]; then
    echo "Fehler: $required fehlt. Führen Sie zuerst backup.sh und verify-backup.sh aus." >&2
    exit 1
  fi
done

if ! (cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS >/dev/null); then
  echo "Fehler: Prüfsummen sind ungültig. Die verschlüsselte Kopie wird nicht erzeugt." >&2
  exit 2
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
tar -C "$(dirname "$BACKUP_DIR")" -czf - "$(basename "$BACKUP_DIR")" | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 -md sha512 -out "$OUTPUT_FILE"

printf 'Verschlüsselte Kopie erzeugt: %s\n' "$OUTPUT_FILE"
printf 'Bewahren Sie das Passwort getrennt vom Archiv auf. Prüfen Sie die Entschlüsselung auf einem getrennten Testsystem.\n'
