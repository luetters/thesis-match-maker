# Bereitstellungsleitfaden: Thesis Match Maker bei IONOS oder Hetzner

**Zielgruppe:** Superadmin, Hochschul-IT oder beauftragte:r Systemadministrator:in  
**Stand:** 19. August 2026  
**Geltungsbereich:** Autarke Bereitstellung des Portals „Thesis Match Maker“ für die **HTW Berlin** auf einem eigenen Server bei IONOS oder Hetzner.

> **Wichtig:** Führen Sie die Umstellung zuerst auf einem Testserver durch. Der Produktivwechsel erfolgt erst nach einem vollständigen Funktionstest, einem geprüften Datenbank-Backup und einer abgestimmten DNS-Umstellung.

## 1. Entscheidung: IONOS oder Hetzner

Beide Anbieter sind für die Anwendung geeignet. Das Portal unterstützt einen lokalen Dateispeicher sowie S3-kompatiblen Object Storage. IONOS Object Storage ist S3-kompatibel; bei Hetzner stehen S3-kompatible Buckets und die Regionen Falkenstein, Nürnberg und Helsinki zur Verfügung. [1] [2]

| Kriterium | IONOS | Hetzner |
|---|---|---|
| Server | Cloud Server im Cloud Panel | Cloud Server in der Hetzner Console |
| Objektspeicher | IONOS Object Storage (S3-kompatibel) | Object Storage (S3-kompatibel) |
| Administration | Cloud Panel / Data Center Designer | Hetzner Console |
| S3-Endpunkt | Den für den gewählten IONOS-Standort im DCD angezeigten Endpunkt verwenden | `fsn1.your-objectstorage.com`, `nbg1.your-objectstorage.com` oder `hel1.your-objectstorage.com` [2] |
| Empfehlung | Sinnvoll, wenn die Hochschule bereits IONOS nutzt | Sinnvoll bei schlanker Cloud-Verwaltung und Server-/Object-Storage-Betrieb in einer Konsole |

Für die Wahl sind vor allem Hochschulvorgaben zu Auftragsverarbeitung, Vertragskonto, Rechenzentrumsstandort, Administrationsrechten und Backup-Aufbewahrung maßgeblich. Die technische Anwendungskonfiguration ist bei beiden Wegen identisch.

## 2. Was vor Beginn vorliegen muss

Bitte halten Sie die folgenden Informationen bereit. **Zugangsschlüssel dürfen nicht per E-Mail oder Ticket im Klartext weitergegeben werden.**

| Benötigte Information | Beispiel / Zweck | Verantwortlich |
|---|---|---|
| Server-IP und SSH-Schlüssel | Administrativer Zugriff auf Linux | Hochschul-IT |
| Ziel-Domain | `thesis.htw-berlin.com` | DNS-Verwaltung |
| DNS-Zugriff | Umstellung des A-/AAAA-Records | DNS-Verwaltung |
| SMTP-Zugang | Versand von System-, Frist- und Sicherheits-E-Mails | Hochschul-IT |
| S3-Endpunkt, Bucket, Access Key, Secret Key | Private Speicherung von Uploads und Backups | Cloud-Administration |
| Datenbank-Zugang | MySQL 8.0 oder kompatible Instanz | Server-/DB-Administration |
| Wartungsfenster | Termin für den finalen DNS-Wechsel | Fachbereich / Hochschul-IT |

## 3. Zielarchitektur

Die Anwendung besteht aus einem Docker-Container für das Portal, einer MySQL-Datenbank, einem privaten S3-Bucket und einem Reverse Proxy für HTTPS. Externe Zugriffe sind auf HTTPS beschränkt. Die Datenbank und der S3-Speicher werden **nicht** direkt aus dem Internet erreichbar gemacht.

| Komponente | Empfohlene Bereitstellung | Sicherheitsanforderung |
|---|---|---|
| Portal | Docker-Container, intern Port 3000 | Nur Reverse Proxy darf den Port erreichen |
| Reverse Proxy | Nginx oder Caddy | TLS, HSTS, Weiterleitung HTTP → HTTPS |
| Datenbank | MySQL 8.0+, Docker oder verwaltete Instanz | Kein öffentlicher Port 3306 |
| Dokumente / Uploads | Privater S3-Bucket | Keine öffentliche Bucket-Policy |
| Backups | Separater S3-Präfix oder zweiter Bucket | Verschlüsselung, Aufbewahrungsregel, Wiederherstellungstest |

## 4. Server bei IONOS oder Hetzner anlegen

### 4.1 Servergröße und Betriebssystem

Für den Start empfiehlt sich ein Linux-Server mit **mindestens 2 vCPU, 4 GB RAM und 40 GB SSD**. Bei höherer gleichzeitiger Nutzung, großen Dokumenten oder späterer Ausweitung auf weitere Fachbereiche sollte die Größe anhand der tatsächlichen Auslastung angepasst werden.

Wählen Sie **Ubuntu Server 24.04 LTS**. Legen Sie bei der Servererstellung einen SSH-Schlüssel ab und vermeiden Sie einen dauerhaften Passwortzugang für SSH. IONOS beschreibt öffentliche SSH-Schlüssel als sicherere Alternative zur Passwortanmeldung und empfiehlt, die Passwortanmeldung bei Schlüsselbetrieb zu deaktivieren. [3]

### 4.2 Netzwerk und Firewall

Konfigurieren Sie in der Anbieter-Firewall und auf dem Betriebssystem nur die notwendigen Freigaben.

| Port | Protokoll | Freigabe | Zweck |
|---|---|---|---|
| 22 | TCP | Nur bekannte Administrations-IP-Adressen oder VPN | SSH-Administration |
| 80 | TCP | Öffentlich | HTTP-Weiterleitung zu HTTPS und Zertifikatserneuerung |
| 443 | TCP | Öffentlich | Portalzugriff per HTTPS |
| 3000 | TCP | **Nicht öffentlich** | Interner Anwendungsport |
| 3306 | TCP | **Nicht öffentlich** | Interne Datenbankverbindung |

Bei IONOS können Firewall-Richtlinien im Cloud Panel verwaltet werden. Die Standard-Firewall kann eingehenden Verkehr nach Regeln filtern; unnötige Ports sollen geschlossen bleiben. [3]

### 4.3 Grundhärtung nach der Anmeldung

Führen Sie nach der ersten SSH-Anmeldung folgende Basisschritte aus:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw fail2ban
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <IHRE_ADMIN_IP> to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Installieren Sie Docker nach der offiziellen Docker-Dokumentation und prüfen Sie anschließend:

```bash
docker --version
docker compose version
```

Ergänzen Sie regelmäßige Sicherheitsupdates und legen Sie fest, welche IT-Stelle Betriebsalarme entgegennimmt.

## 5. S3-Object-Storage einrichten

### 5.1 IONOS Object Storage

Aktivieren Sie im Data Center Designer zunächst die Berechtigung **Use Object Storage** für die zuständige Gruppe. Danach erstellen Sie unter **Storage & Backup → IONOS Object Storage** einen Bucket und erzeugen unter **Key management** ein Access-/Secret-Key-Paar. IONOS dokumentiert, dass Object Storage nicht standardmäßig für jedes Konto aktiv ist und die Schlüssel für S3-Tools erforderlich sind. [4]

Verwenden Sie einen Bucket-Namen, der den Zweck nicht offenlegt, beispielsweise `htw-thesis-private-prod`. Der Bucket muss **privat** bleiben. Vergeben Sie für das Anwendungskonto ausschließlich die minimal notwendigen Rechte auf diesen Bucket.

### 5.2 Hetzner Object Storage

Erstellen Sie in der Hetzner Console einen Object-Storage-Bucket und danach ein S3-Credential. Hetzner weist darauf hin, dass öffentliche Buckets über eine direkte URL erreichbar sind. Für Prüfungsunterlagen und Uploads ist deshalb ausschließlich die Sichtbarkeit **private** zulässig. [2]

Verwenden Sie abhängig vom Standort einen der folgenden Endpunkte:

| Standort | Endpunkt | Region für das Portal |
|---|---|---|
| Falkenstein | `https://fsn1.your-objectstorage.com` | `fsn1` |
| Nürnberg | `https://nbg1.your-objectstorage.com` | `nbg1` |
| Helsinki | `https://hel1.your-objectstorage.com` | `hel1` |

### 5.3 Verbindung im Portal testen

Melden Sie sich nach der Erstbereitstellung als Superadmin an und öffnen Sie **Infrastruktur → Speicher-Konfiguration**. Tragen Sie Endpunkt, Bucket, Region, Access Key und Secret Key ein. Klicken Sie zunächst auf **„Verbindung testen“**. Erst bei erfolgreicher Prüfung speichern Sie die Konfiguration.

> Der Test sendet keine Dateien. Er prüft ausschließlich, ob der Bucket mit den angegebenen Zugangsdaten erreichbar ist.

## 6. Anwendung und Datenbank bereitstellen

### 6.1 Migrationspaket herunterladen

Melden Sie sich im aktuellen Portal als Superadmin an. Öffnen Sie **Infrastruktur → Migrations-Export** und laden Sie das ZIP-Paket herunter. Es enthält die Anwendungsdateien, Drizzle-Migrationen, Docker-Konfiguration, Dokumentation und die exportierbaren statischen Assets.

Übertragen Sie das Paket über eine verschlüsselte Verbindung auf den Zielserver:

```bash
scp thesis-match-migration.zip <ADMIN>@<SERVER-IP>:/opt/
ssh <ADMIN>@<SERVER-IP>
sudo mkdir -p /opt/thesis-match-maker
sudo unzip /opt/thesis-match-migration.zip -d /opt/thesis-match-maker
sudo chown -R $USER:$USER /opt/thesis-match-maker
cd /opt/thesis-match-maker
```

### 6.2 Datenbank exportieren und importieren

Das Migrations-ZIP enthält das Schema und die Migrationen; die produktiven Datensätze werden separat mit `mysqldump` exportiert. Dies verhindert, dass sensible Daten unkontrolliert in einem allgemeinen Dateiexport verteilt werden.

Erstellen Sie im bisherigen System oder über die autorisierte Datenbankverwaltung einen konsistenten Dump:

```bash
mysqldump --single-transaction --routines --triggers \
  -u <DB_BENUTZER> -p <DB_NAME> > thesis-match-$(date +%F).sql
```

Erstellen Sie auf dem Zielsystem eine Datenbank und einen dedizierten, nicht privilegierten Anwendungsnutzer:

```sql
CREATE DATABASE thesis_match CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'thesis_app'@'%' IDENTIFIED BY '<LANGES_EINMALIGES_PASSWORT>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON thesis_match.* TO 'thesis_app'@'%';
FLUSH PRIVILEGES;
```

Importieren Sie den Dump anschließend aus einem geschützten Verzeichnis:

```bash
mysql -u thesis_app -p thesis_match < thesis-match-YYYY-MM-DD.sql
```

Validieren Sie vor dem Go-live mindestens die Anzahl der Tabellen, die Benutzerzahl, die Anzahl der Thesis-Anfragen und stichprobenartig Dokumentzugriffe.

### 6.3 Umgebungsvariablen anlegen

Kopieren Sie die Vorlage in eine private `.env`-Datei:

```bash
cp deploy/env.example.md .env
chmod 600 .env
```

Setzen Sie mindestens folgende Werte. Geheimnisse gehören ausschließlich in `.env` oder einen Secret-Manager und **nie** in Git.

```env
NODE_ENV=production
PORT=3000
SITE_URL=https://thesis.htw-berlin.com
DATABASE_URL=mysql://thesis_app:<PASSWORT>@db:3306/thesis_match
JWT_SECRET=<openssl rand -hex 32>

SMTP_HOST=<SMTP-SERVER>
SMTP_PORT=587
SMTP_USER=<SMTP-NUTZER>
SMTP_PASS=<SMTP-PASSWORT>
SMTP_FROM=<ABSENDERADRESSE>

S3_ENDPOINT=<IONOS-ODER-HETZNER-ENDPUNKT>
S3_BUCKET=<PRIVATER_BUCKET>
S3_REGION=<REGION>
S3_ACCESS_KEY=<ACCESS_KEY>
S3_SECRET_KEY=<SECRET_KEY>

SCHEDULER_ENABLED=true
CRON_SECRET=<openssl rand -hex 32>
```

### 6.4 Docker-Container starten

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Die Anwendung muss intern auf Port 3000 laufen. Veröffentlichen Sie diesen Port nicht direkt. Konfigurieren Sie davor einen Reverse Proxy (Nginx oder Caddy), der HTTPS terminiert und an `127.0.0.1:3000` weiterleitet.

## 7. Domain und HTTPS umstellen

Legen Sie zunächst einen Testnamen wie `thesis-test.htw-berlin.com` an. Konfigurieren Sie einen A-Record auf die neue IPv4-Adresse; optional einen AAAA-Record auf IPv6. Testen Sie Anmeldung, E-Mail-Versand, Uploads, Dokumentdownloads, Exporte, SAML-Fallback und geplante Aufgaben vollständig.

Erst nach erfolgreichem Test ändern Sie den A-/AAAA-Record der Produktivdomain. Lassen Sie den bisherigen Betrieb bis zum erfolgreichen Funktionstest erreichbar, damit bei Problemen ein Rückwechsel möglich bleibt.

Für TLS verwenden Sie ein gültiges Zertifikat, beispielsweise über Let’s Encrypt. Der Reverse Proxy muss HTTP auf HTTPS umleiten und folgende Schutzregeln aktivieren:

| Regel | Sollzustand |
|---|---|
| HTTP | Immer auf HTTPS umleiten |
| TLS | Nur moderne TLS-Versionen zulassen |
| HSTS | Nach erfolgreicher Testphase aktivieren |
| Uploads | Nur über authentifizierte Portalfunktionen |
| Datenbank | Nur intern im Docker-Netz / privaten Netz erreichbar |

## 8. Backups und Wiederherstellung

Konfigurieren Sie im Portal unter **Infrastruktur → Automatische Backups** zunächst ein tägliches Backup mit mindestens 30 Tagen Aufbewahrung. Wählen Sie für die Sicherungen einen separaten S3-Präfix oder einen getrennten, privaten Bucket.

> **Mindeststandard:** Ein Backup ist erst dann als belastbar anzusehen, wenn die Wiederherstellung auf einem separaten Testsystem erfolgreich geprobt wurde.

Ergänzen Sie ein quartalsweises Wiederherstellungsprotokoll. Dokumentieren Sie dabei Zeitpunkt, verantwortliche Person, verwendetes Backup, Dauer der Wiederherstellung und Ergebnis.

## 9. Abnahme vor dem Produktivwechsel

Nutzen Sie diese Checkliste gemeinsam mit Fachbereich und IT.

| Prüfung | Erledigt |
|---|---|
| Server per SSH-Schlüssel erreichbar; Passwort-SSH deaktiviert | ☐ |
| Firewall erlaubt nur 22 (eingeschränkt), 80 und 443 | ☐ |
| HTTPS-Zertifikat gültig; Weiterleitung HTTP → HTTPS aktiv | ☐ |
| Datenbank ist nicht öffentlich erreichbar | ☐ |
| S3-Bucket ist privat; Verbindungstest im Portal erfolgreich | ☐ |
| Upload, Download und QR-geschütztes Dokument funktionieren | ☐ |
| Passwort-Login, 2FA und Passwort-Zurücksetzen funktionieren | ☐ |
| SMTP-Testmail funktioniert | ☐ |
| Scheduler läuft; 2FA- und Kolloquiumserinnerungen werden protokolliert | ☐ |
| Datenbankdump importiert und Kennzahlen plausibel | ☐ |
| Backup erstellt und Wiederherstellung testweise geprüft | ☐ |
| DNS-Produktivwechsel dokumentiert; Rückfallplan vorhanden | ☐ |

## 10. Betrieb nach der Umstellung

Nach dem Umzug liegt die Verantwortung für Betrieb, Sicherheitsupdates, Backups, Monitoring, Zugangskontrolle und Incident-Reaktion bei der zuständigen Stelle der HTW Berlin beziehungsweise dem beauftragten Hosting-Team. IONOS weist ausdrücklich auf Firewall-Konfiguration, regelmäßige Backups und zeitnahe Betriebssystem-Sicherheitsupdates hin. [3]

Empfohlen wird ein monatlicher Betriebscheck mit folgenden Punkten: verfügbare Sicherheitsupdates, Speicherverbrauch, Backup-Erfolg, Wiederherstellbarkeit, Fehlerprotokolle, ausstehende 2FA-Pflichten und offene Sicherheitswarnungen im Portal.

## Referenzen

[1]: https://docs.ionos.com/cloud/backup-and-storage/ionos-object-storage "IONOS CLOUD Object Storage – Dokumentation"
[2]: https://docs.hetzner.com/storage/object-storage/overview/ "Hetzner Object Storage – Übersicht und Endpunkte"
[3]: https://www.ionos.com/help/server-cloud-infrastructure/getting-started/cloud-servers-getting-started/ "IONOS Cloud Servers – Getting Started und Sicherheitsmaßnahmen"
[4]: https://docs.ionos.com/cloud/backup-and-storage/ionos-object-storage/get-started/setup-access "IONOS Object Storage – Zugriffs- und Schlüsselverwaltung"
