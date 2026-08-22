# Domainaktivierung: `thesismatch.online`

**Ziel:** Das bereits importierte Portal auf dem IONOS-VPS unter `https://thesismatch.online` über Caddy mit automatischem HTTPS erreichbar machen.

> Die Anwendung ist bereits so vorbereitet, dass sie nur lokal auf Port 3000 lauscht. Caddy veröffentlicht ausschließlich HTTP und HTTPS auf den Ports 80 und 443 und leitet intern an die Anwendung weiter. Die MySQL-Datenbank bleibt dabei nicht öffentlich erreichbar.

## Voraussetzungen

| Voraussetzung | Erwarteter Zustand |
|---|---|
| VPS-IP | `217.154.124.8` |
| Firewall | TCP 80 und 443 sind freigegeben; Port 3306 bleibt geschlossen. |
| Docker | App- und Datenbankcontainer laufen gesund. |
| Domain | `thesismatch.online` wird im IONOS-DNS verwaltet. |
| E-Mail-Adresse | Eine erreichbare administrative Adresse für Caddy-Zertifikatsmeldungen steht bereit. |

## Schritt 1: Domainwerte auf dem VPS setzen

Melden Sie sich per SSH auf dem VPS an und öffnen Sie die geschützte Konfigurationsdatei:

```bash
nano /opt/thesis-match-maker/deploy/.env
```

> Hinterlegen Sie dort nur diese beiden Werte beziehungsweise korrigieren Sie sie, falls nötig. Die Caddy-Adresse muss ein erreichbares Postfach sein; sie dient nur für Meldungen rund um Zertifikate.

```text
SITE_DOMAIN=thesismatch.online
CADDY_EMAIL=ihre-erreichbare-adresse@example.org
```

Speichern Sie mit **Strg+O**, Enter und **Strg+X**. Schützen Sie die Datei anschließend:

```bash
chmod 600 /opt/thesis-match-maker/deploy/.env
```

## Schritt 2: DNS bei IONOS setzen

Öffnen Sie im IONOS-Kundenbereich die DNS-Einstellungen der Domain `thesismatch.online`. Legen Sie die folgenden Einträge an oder ersetzen Sie gegebenenfalls bestehende widersprüchliche Einträge.

| Typ | Hostname | Ziel | TTL |
|---|---|---|---|
| A | `@` | `217.154.124.8` | 300 Sekunden oder Standardwert |
| A | `www` | `217.154.124.8` | 300 Sekunden oder Standardwert |

Entfernen Sie für `@` und `www` ggf. vorhandene AAAA-Einträge, die auf keinen IPv6-VPS zeigen. Legen Sie keinen A-Record für Port 3000 und keinen Datenbankeintrag an.

> Die DNS-Änderung lenkt externe Besucher:innen auf den VPS. Führen Sie sie erst durch, wenn Sie die technische Abnahme aus dem Go-live-Abnahmeplan beginnen möchten.

## Schritt 3: Caddy starten

Nach dem Setzen der DNS-Einträge starten Sie auf dem VPS Caddy zusammen mit der bestehenden Anwendung:

```bash
cd /opt/thesis-match-maker
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build caddy
```

Caddy beantragt anschließend automatisch ein TLS-Zertifikat. Prüfen Sie den Status:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
docker compose --env-file deploy/.env -f deploy/docker-compose.yml logs --tail=100 caddy
```

App, Datenbank und Caddy sollen laufen; die App und Datenbank sollen als `healthy` angezeigt werden. Ein gültiges Zertifikat wird erst ausgestellt, wenn die DNS-Einträge öffentlich auf den VPS zeigen und Port 80 erreichbar ist.

## Schritt 4: Extern prüfen

Testen Sie anschließend von einem Gerät außerhalb des VPS-Netzes:

```bash
curl -I https://thesismatch.online
curl -I http://thesismatch.online
```

| Prüfung | Erwartetes Ergebnis |
|---|---|
| `https://thesismatch.online` | Erfolgreiche Antwort und gültiges HTTPS-Zertifikat. |
| `http://thesismatch.online` | Weiterleitung auf HTTPS. |
| Browser | Startseite ohne Zertifikatswarnung. |
| Datenbank | Nicht öffentlich erreichbar. |
| Anmeldung | Noch keine Passwort-Reset-E-Mails auslösen, bis die fachliche Abnahme abgeschlossen ist. |

## Fehlerbehebung

| Beobachtung | Nächster Schritt |
|---|---|
| Caddy erhält kein Zertifikat | DNS-A-Record, Port 80 und Caddy-Logs prüfen. |
| Alte IONOS-Seite erscheint | DNS-Propagation abwarten und widersprüchliche A-/AAAA-Records entfernen. |
| `502 Bad Gateway` | Status des App-Containers und Caddy-Logs prüfen. |
| Port 80/443 nicht erreichbar | IONOS-Firewall und lokale UFW-Regeln prüfen. |
| Portal funktioniert, aber Nutzer:innen können sich nicht anmelden | Erwartet, solange Passwort-Resets bewusst zurückgestellt sind. |

## Freigabepunkt

Nach erfolgreicher HTTPS-Prüfung und fachlicher Abnahme bestätigen Sie ausdrücklich, ob die Domain öffentlich kommuniziert werden soll. Erst danach werden Passwort-Reset-E-Mails nach der von Ihnen gewählten Empfängergruppe versendet.

