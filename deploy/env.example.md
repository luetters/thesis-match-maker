# Umgebungsvariablen – Thesis Match Maker (eigenständiger Betrieb)

Die kopierfähige Vorlage befindet sich in `deploy/environment.example`. Kopieren
Sie diese auf dem Zielserver nach `deploy/.env` und tragen Sie dort die Werte aus
`SECRETS.md` ein. `deploy/.env` ist eine Geheimnisdatei und darf niemals in Git,
ein unverschlüsseltes Archiv oder einen E-Mail-Anhang gelangen.

```bash
cp deploy/environment.example deploy/.env
nano deploy/.env
```

Die Containerdefinition leitet die MySQL-Verbindungszeichenfolge aus
`MYSQL_USER`, `MYSQL_PASSWORD` und `MYSQL_DATABASE` ab. Daher muss keine zweite
Kopie des Datenbankpassworts in einer `DATABASE_URL` gepflegt werden.

| Bereich | Pflichtwerte |
|---|---|
| HTTPS und Domain | `SITE_DOMAIN`, `CADDY_EMAIL` |
| MySQL | `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` |
| Sicherheit | `JWT_SECRET`, `CRON_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` |
| E-Mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Dateispeicher | `STORAGE_LOCAL_DIR` oder die optionalen `S3_*`-Werte |

Für IONOS S3 oder Hetzner Object Storage wird der private Bucket mit
`S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY` und `S3_SECRET_KEY`
ergänzt. Ohne diese Werte nutzt die Anwendung das Docker-Volume `storage_data`.
