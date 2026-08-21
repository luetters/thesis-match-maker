# Selbstbetriebsskripte

Diese Skripte werden **nur auf dem Zielserver** ausgeführt. Sie setzen Docker
Compose v2, `gzip`, `tar`, `sha256sum`, `curl` und für das Quellarchiv `zip`
voraus. Die Skripte lesen Geheimnisse ausschließlich aus `deploy/.env` und
schreiben diese nicht in ihre Ausgaben.

| Skript | Zweck | Beispiel |
|---|---|---|
| `preflight-export.sh` | Prüft Zielserver, Konfiguration, Werkzeuge und Speicherplatz; exportiert keine Daten | `./scripts/selfhosted/preflight-export.sh` |
| `backup.sh` | Sichert MySQL und den lokalen Speicher; S3 wird bei vollständiger S3-Konfiguration zusätzlich exportiert | `./scripts/selfhosted/backup.sh /srv/backups/$(date +%F)` |
| `verify-backup.sh` | Prüft Prüfsummen und die Lesbarkeit der Archivdateien | `./scripts/selfhosted/verify-backup.sh /srv/backups/2026-08-21` |
| `create-export-manifest.sh` | Erstellt nach erfolgreicher Prüfung ein geheimnisfreies Begleitmanifest | `./scripts/selfhosted/create-export-manifest.sh /srv/backups/2026-08-21` |
| `seal-backup.sh` | Erstellt eine interaktiv verschlüsselte, getrennte Kopie eines geprüften Backups | `./scripts/selfhosted/seal-backup.sh /srv/backups/2026-08-21 /mnt/backup/tmm-2026-08-21.tar.gz.enc` |
| `restore.sh` | Spielt ein Backup nach bewusster Bestätigung ein | `./scripts/selfhosted/restore.sh /srv/backups/2026-08-21` |
| `verify-deployment.sh` | Prüft Compose, Container, lokale HTTP- und öffentliche HTTPS-Antwort | `./scripts/selfhosted/verify-deployment.sh` |
| `create-handover-archive.sh` | Erstellt ein quellenbasiertes Übergabe-ZIP ohne Geheimnisse und Produktivdaten | `./scripts/selfhosted/create-handover-archive.sh /srv/uebergabe` |

Ein Backup ist erst belastbar, wenn `verify-backup.sh` erfolgreich war und ein
vollständiger Restore auf einem getrennten Testserver durchgeführt wurde.

Führen Sie vor einem echten Export zuerst ausschließlich die trockene Vorprüfung
aus. Sie schreibt keinen Datenbankdump und überträgt keine Dateien:

```bash
./scripts/selfhosted/preflight-export.sh
```

Der vollständige Ablauf steht in `docs/Exportvorbereitung_Thesis_Match_Maker.md`.

## Lokale Vorschau vor dem ersten Import

Auf einer leeren Zielumgebung muss vor dem endgültigen Import immer zuerst die Manifest-, Prüfsummen- und Leerstandsprüfung laufen. Das Archiv wird dabei nicht entpackt und es werden keine Daten verändert:

```bash
scripts/selfhosted/bootstrap-portable-preview.sh /tmp/thesis-transfer.zip
```

Der Befehl nutzt ausschließlich die lokale Loopback-Verbindung, den serverseitigen `TRANSFER_IMPORT_TOKEN` und die in `deploy/.env` gesetzte Datenbank. Der endgültige Import darf erst nach erfolgreicher Vorschau und ausdrücklicher Freigabe mit `bootstrap-portable-import.sh` erfolgen.
