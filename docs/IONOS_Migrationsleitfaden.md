# IONOS-Migrationsleitfaden – Thesis Match Maker

**Datum:** 18. August 2026
**Autor:** Manus AI

---

## Voraussetzungen

| Komponente | Mindestanforderung |
|---|---|
| **Server** | IONOS VPS L (4 vCPU, 8 GB RAM, 240 GB SSD) oder Cloud Server M |
| **Betriebssystem** | Ubuntu 24.04 LTS |
| **Software** | Docker 24+, Docker Compose v2, Git |
| **Domain** | thesis.htw-berlin.com (DNS A-Record auf die IONOS-IP) |
| **TLS** | Let's Encrypt via Caddy oder certbot + nginx |

---

## Schritt 1: Server einrichten

```bash
# Docker installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Caddy als Reverse Proxy installieren (automatisches HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

## Schritt 2: Repository klonen

```bash
git clone https://github.com/<Ihr-GitHub-Nutzer>/thesis-match-maker.git
cd thesis-match-maker
```

---

## Schritt 3: Umgebungsvariablen konfigurieren

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Füllen Sie alle mit **[PFLICHT]** gekennzeichneten Felder aus. Generieren Sie sichere Schlüssel:

```bash
# JWT_SECRET (64 Zeichen)
openssl rand -base64 48

# CRON_SECRET (32 Zeichen)
openssl rand -hex 16

# TWO_FACTOR_ENCRYPTION_KEY (32 Hex-Zeichen)
openssl rand -hex 16

# MYSQL_ROOT_PASSWORD und MYSQL_PASSWORD
openssl rand -base64 24
```

---

## Schritt 4: Anwendung starten

```bash
cd deploy
docker compose --env-file .env up -d --build
```

Die Anwendung ist nun unter `http://127.0.0.1:3000` erreichbar.

---

## Schritt 5: Datenbank-Migrationen ausführen

```bash
# In den laufenden Container einsteigen
docker compose exec app sh

# Migrationen ausführen
npx drizzle-kit push
```

---

## Schritt 6: Reverse Proxy konfigurieren

Erstellen Sie die Caddy-Konfiguration:

```bash
sudo tee /etc/caddy/Caddyfile <<EOF
thesis.htw-berlin.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip
}
EOF

sudo systemctl reload caddy
```

Caddy bezieht und erneuert das TLS-Zertifikat automatisch über Let's Encrypt.

---

## Schritt 7: Statische Assets migrieren

Die statischen Assets (Logos, Icons, Videos) werden derzeit über `/manus-storage/`-Pfade ausgeliefert. Im lokalen Modus müssen diese Dateien in das Verzeichnis `storage-data/` kopiert werden:

```bash
# Verzeichnis erstellen
mkdir -p storage-data

# Assets aus dem aktuellen Manus-Storage herunterladen
# (ersetzen Sie die URLs durch die tatsächlichen Asset-Pfade)
curl -o storage-data/logo-icon_b7dba00c.webp https://thesis.htw-berlin.com/manus-storage/logo-icon_b7dba00c.webp
curl -o storage-data/logo-sidebar_8dd3989f.webp https://thesis.htw-berlin.com/manus-storage/logo-sidebar_8dd3989f.webp
curl -o storage-data/icon-female_612c1055.webp https://thesis.htw-berlin.com/manus-storage/icon-female_612c1055.webp
curl -o storage-data/icon-male2_9e670c3a.webp https://thesis.htw-berlin.com/manus-storage/icon-male2_9e670c3a.webp
curl -o storage-data/icon-allgender_64b60a63.webp https://thesis.htw-berlin.com/manus-storage/icon-allgender_64b60a63.webp
curl -o storage-data/thesis-logo-512_6fcdaa04.png https://thesis.htw-berlin.com/manus-storage/thesis-logo-512_6fcdaa04.png
curl -o storage-data/ThesisMatchMaker_b92cd3c0.jpg https://thesis.htw-berlin.com/manus-storage/ThesisMatchMaker_b92cd3c0.jpg
curl -o storage-data/ThesisMatchMaker_e15e6348.jpg https://thesis.htw-berlin.com/manus-storage/ThesisMatchMaker_e15e6348.jpg
```

Prüfen Sie nach dem Kopieren und nach jedem Release die tatsächlich verwendeten öffentlichen Medien über den lokalen App-Port. Das Skript ist geheimnisfrei und greift weder auf die Datenbank noch auf private Fachakten zu:

```bash
chmod +x scripts/selfhosted/verify-public-media.sh
scripts/selfhosted/verify-public-media.sh http://127.0.0.1:3000
```

Erst wenn alle gemeldeten Dateien mit `[OK]` bestätigt werden, sind Logos, Icons, Hintergrundvideos und Leitfäden im lokalen Speicher vollständig verfügbar. Die bestehenden `/manus-storage/`-Pfade bleiben dabei bewusst als kompatible öffentliche Route erhalten, werden im lokalen Betriebsmodus aber ausschließlich aus `storage-data/` ausgeliefert.

---

## Schritt 8: Datenbank migrieren

Exportieren Sie die bestehende Datenbank und importieren Sie sie auf dem neuen Server:

```bash
# Auf dem aktuellen Server (oder über die Manus-Datenbankverwaltung):
mysqldump -h <alter-host> -u <user> -p thesis_match > thesis_match_backup.sql

# Auf dem IONOS-Server:
docker compose exec -T db mysql -u thesis -p<MYSQL_PASSWORD> thesis_match < thesis_match_backup.sql
```

---

## Schritt 9: DNS umstellen

Ändern Sie den DNS-A-Record für `thesis.htw-berlin.com` auf die IP-Adresse des IONOS-Servers. Die TTL sollte vorher auf 300 Sekunden reduziert werden, um die Umstellung zu beschleunigen.

---

## Betrieb und Wartung

### Aktualisierungen

```bash
cd thesis-match-maker
git pull
cd deploy
docker compose --env-file .env up -d --build
docker compose exec app npx drizzle-kit push
```

### Backup

```bash
# Täglicher MySQL-Dump (als Cron-Job einrichten)
docker compose exec -T db mysqldump -u thesis -p<MYSQL_PASSWORD> thesis_match | gzip > /backup/thesis_match_$(date +%Y%m%d).sql.gz

# Storage-Daten sichern
tar czf /backup/storage_$(date +%Y%m%d).tar.gz storage-data/
```

### Logs

```bash
# Anwendungslogs
docker compose logs -f app

# Datenbanklogs
docker compose logs -f db
```

### Laufende Kosten

| Posten | Geschätzte Kosten |
|---|---|
| IONOS VPS L | ca. 12 EUR/Monat |
| IONOS S3 (optional, 10 GB) | ca. 2 EUR/Monat |
| Domain (falls nicht vorhanden) | ca. 1 EUR/Monat |
| **Gesamt** | **ca. 13–15 EUR/Monat** |

---

## Ersetzte Manus-Abhängigkeiten

| Manus-Dienst | Ersatz | Datei |
|---|---|---|
| Forge Storage (S3 Presign) | Lokales Dateisystem oder IONOS S3 | `server/storageLocal.ts` |
| Heartbeat (Cron-HTTP) | node-cron im selben Prozess | `server/scheduler.ts` |
| OAuth Callback | Entfällt (Passwort-Login + optional SAML) | `server/_core/oauth.ts` (inaktiv) |
| Manus CDN (Asset-URLs) | Lokale Auslieferung über `/manus-storage/` | `server/_core/storageProxy.ts` |

---

## Hetzner-Server als Alternative

Das Portal unterstützt neben IONOS auch **Hetzner Cloud** und **Hetzner Storage Box** (S3-kompatibel). Die Einrichtung ist identisch; lediglich der S3-Endpunkt unterscheidet sich:

| Anbieter | S3-Endpunkt | Region |
|---|---|---|
| IONOS | `https://s3.eu-central-1.ionoscloud.com` | `de` |
| Hetzner (Falkenstein) | `https://fsn1.your-objectstorage.com` | `fsn1` |
| Hetzner (Nürnberg) | `https://nbg1.your-objectstorage.com` | `nbg1` |
| Hetzner (Helsinki) | `https://hel1.your-objectstorage.com` | `hel1` |

Setzen Sie in der `.env`-Datei den passenden Endpunkt:

```env
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_BUCKET=thesis-match
S3_REGION=fsn1
S3_ACCESS_KEY=<Ihr Hetzner S3 Access Key>
S3_SECRET_KEY=<Ihr Hetzner S3 Secret Key>
```

Alternativ können Sie die S3-Zugangsdaten direkt im **Superadmin-Dashboard → Infrastruktur** konfigurieren.
