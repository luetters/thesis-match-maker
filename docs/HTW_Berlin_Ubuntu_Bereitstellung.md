# Thesis Match Maker auf einem Ubuntu-Server der HTW Berlin bereitstellen

Dieses Dokument beschreibt die **eigenständige** Bereitstellung des Thesis Match Maker auf einem Ubuntu-Server der HTW Berlin. Die Anwendung benötigt keinen externen Authentifizierungsanbieter: Die Anmeldung erfolgt über E-Mail-Adresse, Passwort und – falls für die Rolle aktiviert – Zwei-Faktor-Authentifizierung. Die Konfigurationsdatei mit Geheimnissen bleibt ausschließlich auf dem Server.

> **Zuständigkeit:** Der produktive Betrieb darf erst nach Freigabe durch die zuständige IT-Sicherheit, Datenschutzkoordination, Prüfungsverwaltung und Domainverwaltung erfolgen. Diese Anleitung verändert weder DNS noch Firewallregeln automatisch.

## 1. Lieferumfang

| Bestandteil | Aufgabe |
|---|---|
| `deploy/docker-compose.yml` | Startet Anwendung, MySQL und Caddy als voneinander getrennte Container. Die Datenbank ist nicht öffentlich freigegeben. |
| `deploy/htw-ubuntu-deploy.sh` | Prüft Konfiguration und Dateirechte, baut die Anwendung, startet die Container und prüft die lokale Erreichbarkeit. |
| `deploy/environment.example` | Geheimnisfreie Vorlage für die produktive Datei `deploy/.env`. |
| `deploy/Caddyfile` | Reverse Proxy mit HTTPS-Weiterleitung und zusätzlichen Browser-Schutzheadern. |
| `scripts/selfhosted/backup.sh` | Erstellt konsistente Datenbank- und Dateisicherungen mit Prüfsummen. |
| `deploy/systemd/*.service` und `*.timer` | Vorlage für eine tägliche Sicherung durch systemd. |

## 2. Vorbedingungen, die die HTW Berlin bereitstellt

Der Server benötigt Ubuntu 24.04 LTS oder 22.04 LTS in 64-Bit-Ausführung, einen aktuellen Docker Engine mit Compose-Plugin sowie administrativen Zugriff für die verantwortliche Betriebsgruppe. Docker dokumentiert die unterstützten Ubuntu-LTS-Versionen und empfiehlt für Produktionssysteme die Installation über das offizielle Paket-Repository statt über das Convenience-Skript.[1]

Für eine öffentlich vertrauenswürdige TLS-Verbindung müssen vor dem ersten Start ein freigegebener DNS-Name auf den Server zeigen und die Ports **80/TCP** sowie **443/TCP** an Caddy weitergeleitet sein. Caddy beschafft und erneuert Zertifikate automatisch, wenn Domain, DNS, Ports und persistenter Schreibspeicher korrekt vorbereitet sind.[2]

| Von der HTW Berlin bereitzustellen | Mindestanforderung |
|---|---|
| DNS | Ein freigegebener, eindeutiger FQDN, zum Beispiel `thesis.htw-berlin.de`; A-/AAAA-Eintrag erst nach der fachlichen Abnahme setzen. |
| Netzwerk | Eingehend ausschließlich 80/TCP und 443/TCP; SSH nur aus administrativen Netzen bzw. über einen Bastion Host. Keine öffentliche MySQL-Freigabe. |
| E-Mail | SMTP-Zugang für eine dedizierte Portalabsenderadresse; kein echtes HTW-Passwort in der Anwendung verwenden. |
| Datensicherung | Verschlüsseltes Ziel außerhalb des Servers, Aufbewahrungs- und Wiederherstellungskonzept nach den Vorgaben der HTW Berlin. |
| Betrieb | Benannte Betriebsverantwortliche für Updates, Sicherheitsmeldungen, Notfälle und regelmäßige Wiederherstellungsproben. |

## 3. Einmalige Installation

### Schritt 1: Docker bereitstellen

Die verantwortliche Administration installiert Docker Engine und das Compose-Plugin über das offizielle Docker-Paket-Repository. Anschließend ist der Dienststatus zu prüfen:

```bash
sudo systemctl status docker
sudo docker compose version
```

Die Docker-Dokumentation weist darauf hin, dass veröffentlichte Containerports Firewallregeln umgehen können. Die Firewall- und Netzfreigabe ist deshalb durch die HTW-Berlin-Administration zu prüfen; insbesondere darf **3306/TCP** nicht veröffentlicht werden.[1]

### Schritt 2: Release ablegen

Das geprüfte, geheimnisfreie Releasearchiv wird ausschließlich über den freigegebenen Übertragungsweg auf dem Server abgelegt und nach `/opt/thesis-match-maker` entpackt. Die Signatur bzw. SHA-256-Prüfsumme muss vor dem Entpacken verglichen werden.

```bash
sudo install -d -m 0750 -o root -g root /opt/thesis-match-maker
sudo unzip -q thesis-match-maker-source.zip -d /opt/thesis-match-maker
sudo chown -R root:root /opt/thesis-match-maker
sudo chmod 750 /opt/thesis-match-maker/deploy/htw-ubuntu-deploy.sh
```

### Schritt 3: Geheimnisse ausschließlich auf dem Server setzen

Die Datei `deploy/.env` wird **nicht** aus Git, einem E-Mail-Anhang oder dem Releasearchiv übernommen. Die Werte werden nur direkt auf dem Server in einer geschützten Sitzung eingetragen:

```bash
cd /opt/thesis-match-maker
sudo cp deploy/environment.example deploy/.env
sudo chown root:root deploy/.env
sudo chmod 600 deploy/.env
sudoedit deploy/.env
```

Es müssen insbesondere lange, unabhängige Zufallswerte für `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `JWT_SECRET`, `CRON_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` und `TRANSFER_IMPORT_TOKEN` eingetragen werden. `TWO_FACTOR_ENCRYPTION_KEY` muss ein 32-stelliger Hexadezimalwert sein. Außerdem sind der freigegebene Domainname, die SMTP-Daten und eine dedizierte Absenderadresse zu setzen. Geheimnisse werden nicht im Chat, in Tickets oder in Screenshots geteilt.

### Schritt 4: Erste Installation starten

Auf einer **neuen, nachweislich leeren** Datenbank wird die Schema-Initialisierung nur mit der doppelten Bestätigung ausgeführt:

```bash
cd /opt/thesis-match-maker
sudo deploy/htw-ubuntu-deploy.sh --initialize-empty-database --confirm-empty-database
```

Auf einem bereits abgenommenen Datenbestand wird ohne Initialisierungsoption bereitgestellt:

```bash
cd /opt/thesis-match-maker
sudo deploy/htw-ubuntu-deploy.sh
```

Das Deploy-Skript gibt keine Geheimwerte aus, validiert die Compose-Datei vor dem Start und prüft anschließend ausschließlich die lokale Anwendung unter `127.0.0.1:3000`. Docker Compose unterstützt hierfür explizite Compose- und Umgebungsdateien über `-f` und `--env-file`.[3]

## 4. Erste technische Abnahme

Nach einem erfolgreichen lokalen Health-Check prüft die verantwortliche Administration die Container und zunächst die interne Erreichbarkeit:

```bash
cd /opt/thesis-match-maker
sudo docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/
```

Erst nach DNS- und Netzfreigabe erfolgen die externe HTTPS-Prüfung, ein Rollentest mit getrennten Testkonten und ein kontrollierter Test der E-Mail-Zustellung. Passwort-Reset-Massenversände, reale Prüfungsdaten und DNS-Änderungen bleiben bis zur ausdrücklichen Freigabe zurückgestellt.

## 5. Regelbetrieb und Update

Ein Update erfolgt mit einem zuvor geprüften Releasearchiv und einem aktuellen Backup. Änderungen an `deploy/.env` erfolgen nur über die Betriebsadministration. Die Datei wird nie durch eine Release-Synchronisierung überschrieben.

| Tätigkeit | Sicherer Ablauf |
|---|---|
| Update | Backup prüfen, freigegebenes Release mit SHA-256 vergleichen, nach `/opt/thesis-match-maker` übernehmen, `sudo deploy/htw-ubuntu-deploy.sh` ausführen, Health-Check sowie Rollentest dokumentieren. |
| Fehlersuche | `docker compose ... ps` und `docker compose ... logs --tail=150 app caddy` verwenden. Keine Geheimwerte aus `deploy/.env` ausgeben. |
| Rückfall | Vor dem Update erstelltes, geprüftes Release verwenden; Datenbank-Restore ausschließlich nach dokumentierter Freigabe und Wiederherstellungsprobe. |
| Geheimniswechsel | Zuerst aktualisierte Werte geschützt ablegen, anschließend Container kontrolliert neu starten; bestehende Sitzungen können dadurch ungültig werden. |

## 6. Tägliche Sicherung aktivieren

Die mitgelieferte systemd-Vorlage erstellt täglich eine lokale Sicherung. Sie ersetzt nicht die notwendige verschlüsselte Übertragung an einen getrennten Speicherort und nicht die regelmäßige Wiederherstellungsprobe.

```bash
sudo install -m 644 deploy/systemd/thesis-match-maker-backup.service /etc/systemd/system/
sudo install -m 644 deploy/systemd/thesis-match-maker-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now thesis-match-maker-backup.timer
sudo systemctl list-timers thesis-match-maker-backup.timer
```

Die Sicherungen liegen standardmäßig unter `/opt/thesis-match-maker/backups/`. Nach jedem Lauf werden die Prüfsummen mit dem mitgelieferten Skript geprüft und die Dateien gemäß den Vorgaben der HTW Berlin verschlüsselt außerhalb des Servers abgelegt.

```bash
sudo /opt/thesis-match-maker/scripts/selfhosted/verify-backup.sh /opt/thesis-match-maker/backups/<zeitstempel>
```

## 7. Abnahmekriterien vor Produktivstart

Der Produktivstart ist erst zulässig, wenn die folgenden Punkte von den zuständigen Stellen dokumentiert abgenommen wurden: TLS-Zertifikat und HTTPS-Weiterleitung, geschlossene Datenbankports, gesicherte Geheimnisdatei, getestete Backups inklusive Wiederherstellung, Rollen- und Berechtigungstests, E-Mail-Zustellung, Datenschutz-/Prüfungsrechtsfreigabe sowie ein benannter Notfall- und Updateprozess.

> Das Portal ist kein offizielles Tool der HTW Berlin. Nutzende dürfen in diesem Portal niemals ihr echtes HTW-Berlin-Passwort verwenden.

## Quellen

[1] [Docker: Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

[2] [Caddy: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)

[3] [Docker: `docker compose` CLI reference](https://docs.docker.com/reference/cli/docker/compose/)
