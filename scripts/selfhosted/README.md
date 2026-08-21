# Selbstbetriebsskripte

Diese Skripte werden **nur auf dem Zielserver** ausgeführt. Sie setzen Docker
Compose v2, `gzip`, `tar`, `sha256sum`, `curl` und für das Quellarchiv `zip`
voraus. Die Skripte lesen Geheimnisse ausschließlich aus `deploy/.env` und
schreiben diese nicht in ihre Ausgaben.

| Skript | Zweck | Beispiel |
|---|---|---|
| `backup.sh` | Sichert MySQL und den lokalen Speicher; S3 wird bei vollständiger S3-Konfiguration zusätzlich exportiert | `./scripts/selfhosted/backup.sh /srv/backups/$(date +%F)` |
| `verify-backup.sh` | Prüft Prüfsummen und die Lesbarkeit der Archivdateien | `./scripts/selfhosted/verify-backup.sh /srv/backups/2026-08-21` |
| `restore.sh` | Spielt ein Backup nach bewusster Bestätigung ein | `./scripts/selfhosted/restore.sh /srv/backups/2026-08-21` |
| `verify-deployment.sh` | Prüft Compose, Container, lokale HTTP- und öffentliche HTTPS-Antwort | `./scripts/selfhosted/verify-deployment.sh` |
| `create-handover-archive.sh` | Erstellt ein quellenbasiertes Übergabe-ZIP ohne Geheimnisse und Produktivdaten | `./scripts/selfhosted/create-handover-archive.sh /srv/uebergabe` |

Ein Backup ist erst belastbar, wenn `verify-backup.sh` erfolgreich war und ein
vollständiger Restore auf einem getrennten Testserver durchgeführt wurde.
