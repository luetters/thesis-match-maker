# Geheimnisse für den Zielbetrieb

Diese Datei enthält **keine echten Geheimwerte**. Sie erklärt, welche Werte vor
dem Start auf dem Zielserver in `deploy/.env` eingetragen werden müssen. Echte
Geheimwerte dürfen niemals in Git, Tickets, Chats, E-Mail-Anhänge oder ein
ungeschütztes Archiv geschrieben werden.

| Variable | Woher der Wert kommt | Format und Schutz |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | selbst erzeugen | 64 zufällige Buchstaben/Ziffern; nur für MySQL-Administration |
| `MYSQL_PASSWORD` | selbst erzeugen | 64 zufällige Buchstaben/Ziffern; Passwort des Anwendungsdatenbankkontos |
| `DATABASE_URL` | aus `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` ableiten | MySQL-URL; nicht in Tickets, Chat oder Git speichern |
| `JWT_SECRET` | selbst erzeugen | mindestens 48 zufällige Bytes; Verlust meldet alle Sitzungen ab |
| `CRON_SECRET` | selbst erzeugen | mindestens 32 zufällige Bytes; schützt tägliche Hintergrundjobs |
| `TWO_FACTOR_ENCRYPTION_KEY` | selbst erzeugen oder einmalig aus dem Bestand übernehmen | genau 32 Hex-Zeichen; Verlust macht bestehende 2FA-Geheimnisse unlesbar |
| `SMTP_*` | Hochschul-IT oder SMTP-Anbieter | Host, Port, Login, Passwort und Absenderadresse |
| `S3_*` | IONOS S3 oder Hetzner Object Storage | nur für einen privaten Bucket mit minimalen Objektberechtigungen |
| `CADDY_EMAIL` | betreute technische Mailadresse | erhält Hinweise von Let's Encrypt; kein Passwort |

Erzeugung auf dem Zielserver:

```bash
openssl rand -hex 32
openssl rand -hex 16
```

Der erste Befehl erzeugt 64 Hex-Zeichen und eignet sich für MySQL, JWT und den
Cron-Schlüssel. Der zweite Befehl erzeugt 32 Hex-Zeichen für
`TWO_FACTOR_ENCRYPTION_KEY`.
