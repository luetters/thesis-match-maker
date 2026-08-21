#!/usr/bin/env bash
set -Eeuo pipefail

# Erstellt nach einem echten Backup ein geheimnisfreies Begleitmanifest.
# Es exportiert keine Daten und verändert die Backupdateien nicht.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

if ! (cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS >/dev/null); then
  echo "Fehler: Prüfsummen sind ungültig. Exportmanifest wird nicht erzeugt." >&2
  exit 2
fi

commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || printf 'unbekannt')"
generated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
manifest="$BACKUP_DIR/EXPORT-MANIFEST.md"

cat > "$manifest" <<EOF
# Exportmanifest Thesis Match Maker

| Feld | Wert |
| --- | --- |
| Erstellt (UTC) | $generated_at |
| Quellcode-Stand | $commit |
| Datenbankarchiv | database.sql.gz |
| Lokaler Dateispeicher | storage-local.tar.gz |
| Prüfsummen | SHA256SUMS |
| Optionale S3-Sicherung | s3/ (nur falls konfiguriert) |
| Geheimnisse enthalten | Nein |

## Vor der Freigabe

- [ ] \`verify-backup.sh\` ohne Fehler ausgeführt
- [ ] Backupordner unverändert an einen zweiten, verschlüsselten Ort kopiert
- [ ] Wiederherstellung auf einem getrennten Ziel erfolgreich getestet
- [ ] Fachliche Abnahme von Rollen, vertraulichen Dokumenten und Fristen dokumentiert
- [ ] DNS-Wechsel erst nach vollständiger Abnahme freigegeben
EOF

printf 'Manifest erzeugt: %s\n' "$manifest"
