# Thesis Match Maker als Docker-Image bereitstellen

Diese Variante ist für den Betrieb auf einem Ubuntu-Server der HTW Berlin vorgesehen, wenn die Anwendung als **vorgebautes Docker-Image** aus einer privaten Registry oder als kontrolliertes Imagearchiv ausgeliefert werden soll. Der Produktivserver benötigt dabei keinen Node.js-, pnpm- oder Quellcode-Build. Geheimnisse, Datenbankdaten und hochgeladene Dateien sind ausdrücklich **nicht** Bestandteil des Images.

> Der Vorgang setzt die Freigabe durch die zuständigen Stellen für IT-Sicherheit, Datenschutz, Netzwerk, E-Mail und Prüfungsverwaltung voraus. Das Deploy-Skript ändert weder Firewall noch DNS.

## Lieferweg auswählen

| Lieferweg | Geeignet wenn | Benötigte Dateien auf dem Server |
|---|---|---|
| Private HTW-Berlin-Registry | Die Betriebsgruppe eine interne Container-Registry und einen technischen Pull-Zugang bereitstellt. | `deploy/docker-compose.image.yml`, `deploy/Caddyfile`, `deploy/.env`, `deploy/htw-ubuntu-image-deploy.sh` |
| Kontrolliertes Imagearchiv | Der Server darf nicht direkt auf eine Registry zugreifen. | Wie oben sowie das vorab geprüfte Imagearchiv inklusive `.sha256`-Datei. |

Ein produktives Image erhält einen **unveränderlichen Tag**, etwa `registry.htw-berlin.de/thesis/thesis-match-maker:2026-09-16` oder einen Release-/Commit-Tag. Der bewegliche Tag `latest` wird durch die Build- und Deploy-Skripte bewusst abgelehnt.

## 1. Image auf einem vertrauenswürdigen Build-System erzeugen

Das Build-System enthält das vollständige, überprüfte Release. Für eine private Registry wird das Image nach einer vorherigen Anmeldung an die Registry gebaut und übertragen:

```bash
cd /pfad/zum/thesis-match-maker
docker login registry.htw-berlin.de
deploy/build-thesis-image.sh \
  --image registry.htw-berlin.de/thesis/thesis-match-maker:2026-09-16 \
  --push
```

Für einen abgeschotteten Zielserver entsteht alternativ ein lokales Imagearchiv mit SHA-256-Prüfsumme:

```bash
deploy/build-thesis-image.sh \
  --image thesis-match-maker:2026-09-16 \
  --archive /sicherer-uebergabeort/thesis-match-maker-2026-09-16.tar
```

Die Docker-CLI kann Images mit `docker image save` in ein Archiv schreiben und auf dem Zielsystem mit `docker image load` wieder einlesen. Der externe Übertragungsweg und die Prüfsumme müssen durch die HTW-Berlin-Betriebsgruppe abgenommen werden.[1]

## 2. Server vorbereiten

Docker Engine und das Compose-Plugin werden über die von Docker dokumentierte Paketquellen-Installation durch die Serveradministration bereitgestellt. Für Produktivsysteme empfiehlt Docker die kontrollierte Paketinstallation statt des Convenience-Skripts.[2]

Der Zielserver erhält einen geschützten Ordner `/opt/thesis-match-maker/deploy` mit den vier oben genannten Deploy-Dateien. Die Datei `deploy/.env` wird ausschließlich auf dem Server angelegt, durch `root:root` verwaltet und auf die Berechtigung `600` beschränkt. Ergänzen Sie darin zusätzlich die Image-Referenz:

```dotenv
THESIS_MATCH_IMAGE=registry.htw-berlin.de/thesis/thesis-match-maker:2026-09-16
```

Bei Registry-Nutzung meldet sich nur die zuständige Betriebsidentität am Server bei der Registry an. Zugangstokens dürfen nie in `deploy/.env`, Git, Tickets, Chatnachrichten oder Screenshots abgelegt werden.

Für ein lokales Imagearchiv wird vor dem Deploy die Prüfsumme kontrolliert und das Image geladen:

```bash
cd /sicherer-uebergabeort
sha256sum --check thesis-match-maker-2026-09-16.tar.sha256
sudo docker image load --input thesis-match-maker-2026-09-16.tar
```

Danach trägt die Betriebsadministration in `THESIS_MATCH_IMAGE` exakt das Image-Tag ein, das beim Build verwendet wurde.

## 3. Erster Start und Updates

Bei einer nachweislich leeren Datenbank wird das Schema nur mit einer doppelten lokalen Bestätigung initialisiert:

```bash
cd /opt/thesis-match-maker
sudo deploy/htw-ubuntu-image-deploy.sh \
  --initialize-empty-database \
  --confirm-empty-database
```

Für Updates auf einem bestehenden, abgenommenen Datenbestand genügt der kontrollierte Start ohne Initialisierungsoption:

```bash
cd /opt/thesis-match-maker
sudo deploy/htw-ubuntu-image-deploy.sh
```

Das Skript prüft die Compose-Konfiguration, zieht bei einer Registry das fest konfigurierte Anwendungsimage, startet die Container und prüft die Anwendung ausschließlich auf `127.0.0.1:3000`. Docker Compose unterstützt die Übergabe einer expliziten Konfigurationsdatei und einer separaten Umgebungsdatei per `-f` beziehungsweise `--env-file`.[3]

## 4. Abnahme und Restrisiken

Die Datenbank bleibt in der Image-Compose-Datei ohne öffentlichen Port. Vor externer Freigabe prüft die HTW-Berlin-Administration die veröffentlichten Ports, DNS, TLS, Backup, E-Mail-Zustellung und die fachliche Rollenabnahme. Caddy kann TLS-Zertifikate automatisch verwalten, wenn der DNS-Name zum Server zeigt, die Ports 80/443 erreichbar sind und Caddys persistenter Speicher beschreibbar bleibt.[4]

> Das Portal ist kein offizielles Tool der HTW Berlin. Nutzende dürfen darin niemals ihr echtes HTW-Berlin-Passwort verwenden.

## Quellen

[1] [Docker: `docker image save`](https://docs.docker.com/reference/cli/docker/image/save/)

[2] [Docker: Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

[3] [Docker: `docker compose` CLI reference](https://docs.docker.com/reference/cli/docker/compose/)

[4] [Caddy: Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
