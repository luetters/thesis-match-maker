# GitLab-Deploy für den Thesis Match Maker an der HTW Berlin

Diese Anleitung ersetzt den bisherigen GitHub-Deploy durch eine **manuell freizugebende GitLab-CI/CD-Pipeline**. Sie baut und prüft ein unveränderlich getaggtes Docker-Image, legt es in der privaten GitLab Container Registry ab und startet den Server-Deploy erst nach einer bewussten Freigabe. Datenbank, Uploads, lokale Konfiguration und Geheimnisse bleiben ausschließlich auf dem Ubuntu-Server.

> **Wichtig:** Das Repository, die Registry und der Runner müssen innerhalb der von der HTW Berlin freigegebenen Infrastruktur betrieben werden. Die Pipeline ändert weder DNS noch Firewall-Regeln. Ein Produktivdeploy wird nicht durch einen normalen Push ausgelöst, sondern ausschließlich über den manuellen Job `deploy_production` auf dem geschützten Standardbranch.

## 1. Voraussetzungen

| Voraussetzung | Zuständigkeit | Zweck |
|---|---|---|
| Privates Projekt auf `gitlab.htw-berlin.de` | Projektverantwortung | Quellcode und Pipelineverwaltung |
| Aktivierte Container Registry | GitLab-Administration | Private Ablage der geprüften Images |
| GitLab Runner mit Docker-in-Docker-Unterstützung | GitLab-Administration | Build des Docker-Images |
| Ubuntu-Zielserver mit Docker Compose | Serveradministration | Betrieb von Anwendung, MySQL und Caddy |
| Geschütztes `/opt/thesis-match-maker/deploy/.env` | Serveradministration | Laufzeitgeheimnisse, nie im Repository |
| Dedizierter Deploy-Nutzer mit eingeschränktem `sudo` | Serveradministration | Kontrollierter Image-Pull und Neustart |

Die vorhandenen Dateien `deploy/docker-compose.image.yml`, `deploy/htw-ubuntu-image-deploy.sh` und `deploy/update-image-reference.sh` müssen auf dem Zielserver im Projektverzeichnis liegen. Der Produktivserver benötigt lediglich das Projektgerüst, die geschützte `deploy/.env`, Persistenzvolumes und das Image; er baut keinen Anwendungscode.

## 2. Privates GitLab-Projekt anlegen und Quellcode übertragen

1. Melden Sie sich bei `https://gitlab.htw-berlin.de/` an und erstellen Sie ein **leeres privates Projekt** mit dem Namen `thesis-match-maker`. Initialisieren Sie keine README-Datei und keine `.gitignore`-Datei.
2. Kopieren Sie im Projekt die von GitLab angezeigte Clone-URL. Verwenden Sie die URL exakt so, wie sie angezeigt wird, da SSH-Port und Namespace institutionsspezifisch sein können.
3. Fügen Sie den GitLab-Remote in einer vertrauenswürdigen Arbeitskopie hinzu und übertragen Sie den geprüften Branch. Beispiel mit Platzhalter:

```bash
git remote add htw-gitlab <GITLAB-CLONE-URL>
git push htw-gitlab main
git push htw-gitlab --tags
```

Der bestehende GitHub-Remote kann erhalten bleiben, wird aber für diesen Ablauf nicht verwendet. Prüfen Sie vor dem ersten Push in GitLab die Dateien `.gitlab-ci.yml` und `deploy/`, damit keine unautorisierten Pipelineänderungen zusammen mit geschützten Variablen ausgeführt werden.[1]

## 3. Branch und Pipeline schützen

Öffnen Sie in GitLab **Settings → Repository → Protected branches** und schützen Sie den Standardbranch `main`. Nur verantwortliche Personen mit mindestens Maintainer-Rechten sollten in diesen Branch mergen oder den manuellen Produktionsjob ausführen. Deaktivieren oder beschränken Sie manuelle Pipelinevariablen, damit keine Laufzeitwerte über eine Pipeline überschrieben werden können.[2]

Die Pipeline führt auf `main` zuerst `pnpm check` und `pnpm test` aus. Erst bei erfolgreicher Prüfung wird ein Image mit dem Commit-Hash als Tag in die Registry übertragen. Der Eintrag `latest` ist bewusst ausgeschlossen, um nicht versehentlich ein veränderliches Image zu deployen.[1]

## 4. Geschützte GitLab-Variablen anlegen

Öffnen Sie **Settings → CI/CD → Variables** und legen Sie die folgenden Variablen an. Verwenden Sie für alle Geheimwerte **Protected**; für Token zusätzlich **Masked** oder, sofern verfügbar, **Masked and hidden**. Der SSH-Schlüssel und die Hostschlüssel müssen als **File**-Variablen angelegt werden.[2][3]

| Name | Typ | Schutz | Inhalt |
|---|---|---|---|
| `DEPLOY_HOST` | Variable | Protected | Vollständiger Hostname oder IP des HTW-Servers |
| `DEPLOY_USER` | Variable | Protected | Dedizierter, nicht persönlicher Deploy-Nutzer |
| `DEPLOY_APP_DIR` | Variable | Protected | Normalerweise `/opt/thesis-match-maker` |
| `DEPLOY_REGISTRY_USER` | Variable | Protected + Masked | GitLab Deploy-Token mit **read_registry** |
| `DEPLOY_REGISTRY_TOKEN` | Variable | Protected + Masked | Zugehöriges Deploy-Token; kein persönliches Passwort |
| `DEPLOY_SSH_PRIVATE_KEY` | File | Protected | Privater Schlüssel ausschließlich des Deploy-Nutzers; mit abschließendem Zeilenumbruch |
| `DEPLOY_SSH_KNOWN_HOSTS` | File | Protected | Vorab verifizierte Hostschlüssel des Zielservers |

Verwenden Sie für den Registry-Zugriff einen projektgebundenen GitLab Deploy-Token mit der kleinsten erforderlichen Berechtigung `read_registry`. Legen Sie keine Datenbank-, SMTP-, JWT- oder Caddy-Geheimnisse als GitLab-Variablen ab: Sie verbleiben in `/opt/thesis-match-maker/deploy/.env` mit Dateirecht `600`.[2]

## 5. Zielserver einmalig vorbereiten

Die Serveradministration legt einen technischen Deploy-Nutzer an und erlaubt ausschließlich die beiden projektspezifischen Befehle sowie den Registry-Login. Die tatsächlichen Pfade müssen zum Server passen; ein Beispiel für `/etc/sudoers.d/thesis-match-maker-deploy` lautet:

```sudoers
Cmnd_Alias THESIS_IMAGE_DEPLOY = /usr/bin/docker login *, /opt/thesis-match-maker/deploy/update-image-reference.sh *, /opt/thesis-match-maker/deploy/htw-ubuntu-image-deploy.sh
thesis-deploy ALL=(root) NOPASSWD: THESIS_IMAGE_DEPLOY
```

Der öffentliche Schlüssel von `DEPLOY_SSH_PRIVATE_KEY` wird für diesen Nutzer hinterlegt. Die in `DEPLOY_SSH_KNOWN_HOSTS` gespeicherten Hostschlüssel sind **vorher über einen vertrauenswürdigen Administrationskanal** zu prüfen; `ssh-keyscan` darf nicht erst innerhalb der Pipeline ausgeführt werden, weil dies Man-in-the-Middle-Angriffe nicht zuverlässig erkennt.[3]

## 6. Ersten kontrollierten Deploy ausführen

1. Öffnen Sie in GitLab **Build → Pipelines** und wählen Sie die erfolgreiche Pipeline des geschützten Branches `main`.
2. Prüfen Sie den Job `build_production_image`. Der Log muss zeigen, dass das Image mit einem Commit-Hash in die private Registry übertragen wurde.
3. Starten Sie erst nach dieser Prüfung den manuellen Job **`deploy_production`**.
4. Der Job aktualisiert nur die nicht geheime Image-Referenz, zieht das geprüfte Image und führt den vorhandenen lokalen Health-Check aus.
5. Prüfen Sie anschließend mit der HTW-Berlin-Administration die interne Erreichbarkeit, Rollenlogin, Dateien, E-Mail-Zustellung und Backup. Die externe DNS- oder TLS-Freigabe folgt erst nach dieser Abnahme.

Bei einem Fehler ändert das Skript keine Datenbankstruktur ohne die expliziten Optionen `--initialize-empty-database --confirm-empty-database`. Bei einem fehlerhaften Image kann in `deploy/.env` nach Prüfung auf das vorherige Commit-Tag zurückgewechselt und der manuelle Deployjob wiederholt werden.

## 7. Betrieb und Sicherheit

| Regel | Umsetzung |
|---|---|
| Keine automatische Produktionseinspielung | `deploy_production` ist manuell und nur auf dem geschützten Standardbranch verfügbar. |
| Keine Klartextgeheimnisse im Repository | Nur Namen geschützter CI/CD-Variablen stehen in `.gitlab-ci.yml`. |
| Kein persönlicher SSH-Schlüssel | Der Pipeline-Schlüssel ist technisch getrennt und nur für den Deploy-Nutzer gültig. |
| Keine unprüfbaren Hosts | Hostschlüssel werden als File-Variable vorab verifiziert bereitgestellt. |
| Nachvollziehbare Images | Jeder Deploy nutzt den unveränderlichen Commit-Hash als Image-Tag. |
| Rückfall ohne Datenverlust | Rückwechsel erfolgt auf ein vorher geprüftes Image; MySQL-Volume und Uploadvolumes bleiben erhalten. |

## Quellen

[1] [GitLab Docs: Build and push container images](https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/)

[2] [GitLab Docs: CI/CD variables](https://docs.gitlab.com/ci/variables/)

[3] [GitLab Docs: Using SSH keys with GitLab CI/CD](https://docs.gitlab.com/ci/jobs/ssh_keys/)
