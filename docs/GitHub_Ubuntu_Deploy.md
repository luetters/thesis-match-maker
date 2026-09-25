# GitHub Actions: kontrollierter Ubuntu-Deploy

Diese Anleitung ergänzt den bestehenden Betrieb des **Thesis Match Maker** auf einem Ubuntu-Server. Sie verwendet ausschließlich einen manuellen GitHub-Actions-Workflow und einen eingeschränkten Serverzugang. Ein Push nach `main` startet **keinen** Produktionsdeploy.

> **Sicherheitsgrundsatz:** Passwörter, private SSH-Schlüssel, SMTP-Daten und die Datei `deploy/.env` gehören weder in Git noch in GitHub Actions-Protokolle oder Chatnachrichten.

## 1. Einmalige Servervorbereitung

Die Serveradministration benötigt Docker Engine, das Docker-Compose-Plugin, Git, `unzip`, `rsync` und `curl`. MySQL wird ausschließlich im privaten Docker-Netzwerk betrieben; Port 3306 darf nicht öffentlich freigegeben werden.

Für die erste Quellcodeübernahme gibt es zwei sichere Varianten. Entweder wird dem Ubuntu-Server zeitlich begrenzt lesender Zugriff auf das private GitHub-Repository gegeben, oder die Serveradministration überträgt ein geprüftes Quellarchiv über den internen HTW-Berlin-Übertragungsweg. Die nachfolgende Bootstrap-Variante nutzt den lesenden Repositoryzugriff.

Zunächst erzeugt die Serveradministration außerhalb des Repositories ein Ed25519-Schlüsselpaar für GitHub Actions. Der **öffentliche** Teil wird als Datei auf den Ubuntu-Server übertragen; der private Teil wird später ausschließlich als GitHub-Secret gespeichert.

```bash
ssh-keygen -t ed25519 -a 64 -f ./thesis-match-maker-github-actions -C "github-actions@thesis-match-maker"
```

Nach dem erstmaligen Klonen des Quellcodes wird auf dem Ubuntu-Server ausgeführt:

```bash
cd /opt/thesis-match-maker
sudo deploy/github-ubuntu-bootstrap.sh \
  --repository-url git@github.com:luetters/thesis-match-maker.git \
  --actions-public-key /root/thesis-match-maker-github-actions.pub
```

Das Skript prüft Voraussetzungen, übernimmt den Branch `main` in `/opt/thesis-match-maker`, legt eine leere, nur für Root lesbare `deploy/.env` an und richtet den eingeschränkten Systemnutzer `thesis-deploy` ein. Dieser Zugang kann nur ein Release hochladen, einen Deploy/Health-Check starten oder einen kontrollierten Rollback ausführen. Er erhält keine interaktive Root-Shell.

## 2. Geschützte Laufzeitkonfiguration anlegen

Die Serveradministration befüllt anschließend ausschließlich auf dem Server die Datei `/opt/thesis-match-maker/deploy/.env`, ausgehend von `deploy/environment.example`.

```bash
sudo cp /opt/thesis-match-maker/deploy/environment.example /opt/thesis-match-maker/deploy/.env
sudo chown root:root /opt/thesis-match-maker/deploy/.env
sudo chmod 600 /opt/thesis-match-maker/deploy/.env
sudoedit /opt/thesis-match-maker/deploy/.env
```

Erst wenn alle Pflichtwerte gesetzt sind, wird der erste Start ausgeführt:

```bash
sudo /opt/thesis-match-maker/deploy/htw-ubuntu-deploy.sh
```

Der Start prüft die Konfiguration, baut die Container, bewahrt vorhandene Datenbanken, startet den Reverse Proxy und kontrolliert die Anwendung lokal über `http://127.0.0.1:3000/`. Eine Schema-Initialisierung für eine nachweislich leere Datenbank muss gesondert und doppelt bestätigt werden.

## 3. GitHub-Environment und Secrets konfigurieren

Im GitHub-Repository wird unter **Settings → Environments** das Environment `ubuntu-production` angelegt. Für dieses Environment sollten mindestens eine Freigabeperson und restriktive Branchregeln für `main` gesetzt werden.

Unter **Settings → Secrets and variables → Actions** werden die folgenden **Repository Secrets** hinterlegt:

| Secret | Inhalt | Hinweis |
|---|---|---|
| `UBUNTU_DEPLOY_HOST` | DNS-Name oder IP des Ubuntu-Servers | Nicht in den Code schreiben. |
| `UBUNTU_DEPLOY_USER` | `thesis-deploy` | Der eingeschränkte Systemnutzer. |
| `UBUNTU_DEPLOY_SSH_PRIVATE_KEY` | Privater Teil des erzeugten Ed25519-Schlüssels | Mehrzeilig vollständig einfügen. |
| `UBUNTU_DEPLOY_SSH_KNOWN_HOSTS` | vorab geprüfter `known_hosts`-Eintrag des Servers | Kein `ssh-keyscan` innerhalb des Workflows. |

Der `known_hosts`-Eintrag wird vor dem Einfügen über einen vertrauenswürdigen Administrationskanal gegen den SSH-Fingerabdruck des Servers geprüft. Dadurch verhindert der Workflow eine unbemerkte Verbindung zu einem falschen Zielserver.

## 4. Manuellen Deploy auslösen

Nach einer Änderung in `main` öffnen Berechtigte im Repository **Actions → Deploy: Ubuntu-Server → Run workflow** und wählen im Branch-Auswahlfeld ausschließlich `main`. Der Workflow führt nur auf diesem geschützten Branch Prüfungen und Deploys aus. Für die tatsächliche Ausführung muss bewusst `DEPLOY_STARTEN` gewählt werden; der Deploy benötigt zusätzlich die Freigabe des Environments `ubuntu-production`.

Der Workflow prüft zuerst TypeScript und alle Regressionstests. Danach erstellt er aus genau diesem Commit ein ZIP-Releasearchiv, prüft dessen Inhalt, lädt es ausschließlich über den eingeschränkten Deploy-Zugang hoch und startet serverseitig Deploy sowie Health-Check. Die vorhandene `deploy/.env`, die Datenbank und das lokale Storage-Volume werden durch das Releasearchiv nicht überschrieben.

## 5. Betrieb und Rückfall

Nach erfolgreichem Workflow ist der Containerstatus lokal auf dem Server prüfbar:

```bash
cd /opt/thesis-match-maker
sudo docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/
```

Bei einem fehlgeschlagenen Deploy erstellt der Server vor der Synchronisierung ein Rückfallarchiv. Ein Rollback wird ausschließlich durch eine berechtigte Administration über den eingeschränkten Deployweg ausgelöst. DNS-, Firewall-, Datenbank- und Passwortänderungen sind nicht Teil des GitHub-Workflows.

## 6. Lesende Betriebsdiagnose, Superadmin-Erstzugang und weitere Freigaben

Vor einem Passwort-Reset, einer DNS-Änderung oder einem Go-live führt die Administration den lesenden Check `scripts/selfhosted/verify-server-readonly.sh` aus. Er prüft Container, lokalen HTTP-Status, Releaseablage und – optional – minimierte Kontometadaten, ohne Geheimnisse oder Passwort-Hashes auszugeben und ohne Änderungen vorzunehmen.

Wenn nach einem Umzug noch kein Superadmin-Konto vorhanden ist, wird **nicht** über direkte SQL-Befehle oder eine öffentliche Registrierung improvisiert. Die Administration prüft zuerst den vorgesehenen E-Mail-Datensatz und verwendet anschließend nur bei Bedarf den doppelt bestätigten, lokalen Erstzugang gemäß [Superadmin_Erstzugang_HTW_Berlin.md](./Superadmin_Erstzugang_HTW_Berlin.md). Das Kennwort wird dort ausschließlich verdeckt am Server eingegeben; es wird nicht in GitHub Actions, Secrets, Logs oder Chatnachrichten hinterlegt.

Die vollständige Reihenfolge für Datenübernahme, E-Mail-Freigabe, Rollenabnahme und DNS ist in [Administrator_Abnahme_und_Restschritte.md](./Administrator_Abnahme_und_Restschritte.md) dokumentiert.
