# Exportvorbereitung für den Thesis Match Maker

**Stand:** 21. August 2026 · **Zweck:** Vorbereitung eines späteren, kontrollierten Exports ohne produktive Datenübertragung, ohne Domainwechsel und ohne Änderung am laufenden Portal.

> Diese Vorbereitung erstellt **keinen** Datenbankdump und kopiert **keine** Nutzer- oder Dokumentdaten. Sie stellt nur sicher, dass der spätere Export auf dem Zielserver nachvollziehbar, überprüfbar und rückrollbar erfolgen kann.

## 1. Was später exportiert wird

| Bestandteil | Inhalt | Schutz beim Export | Abnahme |
|---|---|---|---|
| Datenbank | Rollen, Thesis-Fälle, Auditdaten, Fristen und Einstellungen | Konsistenter MySQL-Dump, verschlüsselte Zielablage | SQL-Dump lesbar und auf Testserver wiederherstellbar |
| Privater Dateispeicher | Antrags-, Prüfungs- und Uploaddokumente | Archiv ohne öffentliche Freigabe | Archiv lesbar, Zugriffe nach Restore rollenbasiert |
| Optionaler S3-Speicher | Hinterlegte Objekte im konfigurierten Bucket | Separater Bucket-Export, keine Zugangsdaten im Archiv | Objektanzahl und Prüfsummen plausibel |
| Code und Betriebsdateien | Git-Stand, Compose-Dateien, Skripte, Dokumentation | Geheimnisfreies Übergabearchiv | Archiv enthält keine `.env`, keinen lokalen Speicher und keine Datenbankdumps |
| Plattform-Sicherung | Vollständiger Momentstand von Website, Dateien, Datenbank und Konfiguration | Exportpaket unverändert aufbewahren | Paket vorhanden und vollständig |

Ein Quellcode-Download allein ersetzt keine vollständige Sicherung: Datenbank, Dateien, Konfiguration und gegebenenfalls plattformgebundene Funktionen sind davon getrennt zu sichern.[1]

## 2. Vor dem späteren Export

Die Verwaltung legt ein ruhiges Exportfenster fest. In dieser Zeit werden keine Rollenfreigaben, Friständerungen, Uploads oder Konfigurationsänderungen vorgenommen. Falls ein längeres Zeitfenster nötig ist, informiert die Verwaltung alle betroffenen Rollen vorab. Das laufende Portal bleibt bis zur fachlichen Abnahme auf der bisherigen Adresse erreichbar.

| Zuständigkeit | Vorbereitung | Nachweis |
|---|---|---|
| Superadmin | Zielserver und verschlüsselten Speicherort bereitstellen | Zugriffsprotokoll, keine Zugangsdaten im Chat oder Repository |
| Verwaltung | Exportfenster und Änderungsstopp koordinieren | Zeitfenster und verantwortliche Person dokumentiert |
| Technik | Zielserver mit Docker, `deploy/.env` und ausreichendem Speicher vorbereiten | Ergebnis von `preflight-export.sh` |
| Datenverantwortliche Person | Vollständige Plattform-Sicherung als Momentaufnahme anstoßen | Originalexportpaket unverändert abgelegt |

Die Plattform-Sicherung ist ein fester Zeitpunkt. Änderungen, die danach erfolgen, sind nicht enthalten; bei einem lebenden Portal ist daher zusätzlich kurz vor dem Umzug eine letzte aktuelle Sicherung notwendig.[1]

## 3. Trockene Vorprüfung auf dem Zielserver

Kopieren Sie zuerst das geheimnisfreie Übergabearchiv auf den Zielserver und erstellen Sie dort `deploy/.env` ausschließlich aus `deploy/environment.example`. Die Erläuterung der einzelnen Werte steht in `deploy/SECRETS.md`.

```bash
cd /opt/thesis-match-maker
chmod +x scripts/selfhosted/*.sh
scripts/selfhosted/preflight-export.sh
```

Das Skript prüft Werkzeuge, Konfigurationsdateien, Pflichtwerte, Schreibrechte und freien Speicher. Es erstellt ausschließlich `export-preflight/export-preflight.txt`. Die Datei enthält keine Geheimnisse und keine personenbezogenen Daten. Ein Ergebnis **NICHT EXPORTBEREIT** wird vor dem Export vollständig behoben.

## 4. Reihenfolge beim echten Export

Der nachfolgende Ablauf wird erst ausgeführt, wenn Zielserver, Verschlüsselung und Verantwortlichkeiten bestätigt sind.

1. Eine vollständige Plattform-Sicherung über die offizielle Sicherungsoberfläche erstellen und das Paket unverändert ablegen.
2. Die Anwendung kurz vor dem Export in einen abgestimmten Änderungsstopp versetzen.
3. Auf dem Zielserver den lokalen Datenexport ausführen: `scripts/selfhosted/backup.sh /sicherer/pfad/backup-YYYYMMDD`.
4. Unmittelbar danach `scripts/selfhosted/verify-backup.sh /sicherer/pfad/backup-YYYYMMDD` ausführen.
5. Das geheimnisfreie Begleitmanifest erstellen: `scripts/selfhosted/create-export-manifest.sh /sicherer/pfad/backup-YYYYMMDD`.
6. Den gesamten Backupordner verschlüsselt an einen zweiten, getrennten Speicherort übertragen: `scripts/selfhosted/seal-backup.sh /sicherer/pfad/backup-YYYYMMDD /zweiter-ort/tmm-backup.tar.gz.enc`. Das Passwort wird interaktiv abgefragt und darf weder in den Chat noch in das Repository geschrieben werden.
7. Den Wiederherstellungstest auf einem getrennten Testziel ausführen. Erst nach erfolgreicher Abnahme darf die Domain umgestellt werden.

## 5. Wiederherstellung und fachliche Abnahme

Der Restore-Befehl überschreibt die Datenbank und den lokalen Dateispeicher des **Zielsystems**. Er darf deshalb nur auf dem isolierten Test- oder Zielserver ausgeführt werden:

```bash
scripts/selfhosted/restore.sh /sicherer/pfad/backup-YYYYMMDD
scripts/selfhosted/verify-deployment.sh
```

| Prüfkriterium | Fachliche Abnahme |
|---|---|
| Anmeldung | Passwort-Login und verpflichtende Zwei-Faktor-Authentifizierung funktionieren |
| Rollen | Studierende, Erstprüfer:innen, Zweitprüfer:innen und Verwaltung sehen nur ihre erlaubten Daten |
| Daten | Stichprobe von Anträgen, Fristen, Auditverlauf und vertraulichen Fällen vollständig |
| Dateien | Geschützte Dokumente nur nach Berechtigung abrufbar; öffentliche Abstracts bleiben getrennt |
| Betrieb | E-Mail-Test, Scheduler-Protokoll, HTTPS und Wiederherstellungsprüfung erfolgreich |

Bei einem Fehler bleibt die bisherige produktive Adresse unverändert. Es wird **kein** DNS-Wechsel vorgenommen, bevor die fachliche und technische Abnahme dokumentiert ist.

Das ausfüllbare Protokoll für Exportfenster, technische Prüfung und Go-/No-Go-Entscheidung steht in `docs/Exportfenster_und_Abnahmeprotokoll.md`.

## 6. Begrenzungen und sichere Aufbewahrung

Die hier bereitgestellten Skripte bereiten einen Export für den unabhängigen Docker-Betrieb vor. Der tatsächliche Produktivexport wird bewusst nicht automatisch aus der laufenden Umgebung ausgelöst. Für betroffene Plattformkonten gilt zusätzlich die offizielle Sicherungsfrist; die Benachrichtigung im Konto und per E-Mail bestimmt, ob und welcher Export erforderlich ist.[1]

Bewahren Sie die vollständigen Exportpakete unverändert auf. Einzelteile verschiedener Exporte dürfen nicht miteinander ersetzt oder umbenannt werden, damit die spätere Wiederherstellung nachvollziehbar bleibt.[1]

## Referenzen

[1] [Manus: Datensicherung und Wiederherstellung für Websites](https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data)
