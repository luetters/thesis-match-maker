# Umgebungsvariablen – Thesis Match Maker (IONOS)

Kopieren Sie diese Datei nach `.env` und füllen Sie die Werte aus.

```env
# ─── Datenbank ──────────────────────────────────────────────────────────────
MYSQL_ROOT_PASSWORD=<sicheres Passwort>
MYSQL_PASSWORD=<sicheres Passwort>

# ─── Sicherheit ─────────────────────────────────────────────────────────────
JWT_SECRET=<mindestens 32 Zeichen, z.B. openssl rand -base64 48>
CRON_SECRET=<z.B. openssl rand -hex 16>
TWO_FACTOR_ENCRYPTION_KEY=<32 Hex-Zeichen, z.B. openssl rand -hex 16>

# ─── Website ────────────────────────────────────────────────────────────────
SITE_URL=https://thesis.htw-berlin.com

# ─── E-Mail (SMTP) ──────────────────────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Thesis Match HTW Berlin <noreply@htw-berlin.de>

# ─── Dateispeicher ──────────────────────────────────────────────────────────
STORAGE_LOCAL_DIR=/app/storage-data

# Optional: IONOS S3 Object Storage
# S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
# S3_BUCKET=thesis-match-storage
# S3_REGION=de
# S3_ACCESS_KEY=
# S3_SECRET_KEY=

# ─── Eigenständiger Scheduler ───────────────────────────────────────────────
SCHEDULER_ENABLED=true
```
