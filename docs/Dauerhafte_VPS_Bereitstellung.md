# GitHub-unabhängige Bereitstellung auf dem IONOS-VPS

## Zielbild

Der IONOS-VPS bleibt die Produktivumgebung für Datenbank, lokale Dateien, SMTP-Zugangsdaten und die laufenden Docker-Container. Die Anwendung wird unabhängig von GitHub über ein geprüftes Releasearchiv und einen **eingeschränkten Deploy-Benutzer** aktualisiert. Damit ist der Betrieb nicht von einer GitHub-Integration oder einem GitHub-Action-Token abhängig.

> Der private Deploy-Schlüssel bleibt ausschließlich auf dem Windows-PC der verantwortlichen Person. Er wird weder im Repository, im Übergabearchiv, in der Anwendung noch im Chat gespeichert.

## Sicherheitsmodell

| Bereich | Regel |
|---|---|
| Quellprojekt | Änderungen werden hier entwickelt, geprüft und als geheimnisfreies Releasearchiv bereitgestellt. |
| VPS-Konfiguration | `deploy/.env` bleibt ausschließlich auf dem VPS mit Dateimodus `600`. Ein Deploy überschreibt sie nicht. |
| Deploy-Konto | `thesis-deploy` erhält keinen interaktiven Shellzugang und akzeptiert nur Upload, `deploy`, `health` und einen begrenzten Rollback. |
| Root-Rechte | Nur das root-eigene Skript `/usr/local/sbin/thesis-deploy` darf Docker neu bauen oder Container starten. |
| Daten und Dateien | Datenbank und lokaler Speicher bleiben in Docker-Volumes und werden von normalen Code-Deploys nicht entfernt. |
| Fehlerfall | Ein Deploy prüft das ZIP vorab, erstellt ein Rückfallarchiv des alten Codes und verlangt anschließend einen Health-Check. |

## Einmalige Einrichtung

Die folgenden Schritte werden einmalig im VPS-SSH-Terminal sowie im Windows-PowerShell-Fenster der verantwortlichen Person ausgeführt.

### 1. Lokales Deploy-Schlüsselpaar erstellen

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\thesis-match-deploy" -C "thesis-match-deploy"
```

Die Passphrase darf leer bleiben, wenn der Schlüssel nur auf einem passwortgeschützten Administrations-PC liegt; eine Passphrase ist dennoch empfehlenswert. Die Datei mit der Endung `.pub` ist der öffentliche Schlüssel.

### 2. Öffentlichen Schlüssel sicher zum VPS übertragen

```powershell
scp "$env:USERPROFILE\.ssh\thesis-match-deploy.pub" root@217.154.124.8:/root/thesis-deploy.pub
```

### 3. Eingeschränktes Deploy-Konto aktivieren

Im VPS-SSH-Terminal:

```bash
chmod 600 /root/thesis-deploy.pub
/opt/thesis-match-maker/scripts/selfhosted/setup-thesis-deploy-user.sh /root/thesis-deploy.pub
rm -f /root/thesis-deploy.pub
```

Danach ist die direkte Root-Anmeldung für normale Deploys nicht mehr erforderlich.

## Normaler Deploy-Ablauf

1. Eine Änderung wird im Quellprojekt umgesetzt und geprüft.
2. Ein neues geheimnisfreies Releasearchiv wird bereitgestellt.
3. Das Archiv wird lokal als Datei gespeichert.
4. In PowerShell wird das mitgelieferte Skript ausgeführt:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& "C:\PFAD\ZUM\deploy-thesis-match.ps1" -ArchivePath "C:\PFAD\ZUR\thesis-match-maker-source.zip"
```

Das Skript lädt das Archiv in den eingeschränkten Eingangsordner, löst den kontrollierten Docker-Deploy aus und endet nur bei erfolgreichem Health-Check. Die bestehende Datenbank, Dateien und `deploy/.env` bleiben erhalten.

## Status und Rollback

Der Dienststatus kann ohne Root-Rechte geprüft werden:

```powershell
ssh -i "$env:USERPROFILE\.ssh\thesis-match-deploy" thesis-deploy@217.154.124.8 health
```

Bei einem fehlgeschlagenen Deploy bleibt die bisher laufende App verfügbar, sofern der neue Container nicht den Health-Check erreicht. Das Deploy-Skript erstellt zusätzlich ein Code-Rückfallarchiv unter `/var/lib/thesis-deploy/releases/`. Ein Rollback sollte erst nach Prüfung des konkreten Archivpfads ausgeführt werden.

## Widerruf

Zum sofortigen Entzug des Deploy-Zugangs genügt auf dem VPS:

```bash
userdel -r thesis-deploy
rm -f /etc/sudoers.d/thesis-deploy /usr/local/sbin/thesis-deploy /usr/local/libexec/thesis-deploy-gateway
```

Danach kann ein neues Schlüsselpaar erstellt und der Einrichtungsweg erneut durchgeführt werden.

## Alternative ohne Windows-OpenSSH: FileZilla mit bewusster Freigabedatei

Wenn auf dem Windows-PC weder `ssh` noch `scp` verfügbar sind, kann der VPS einen separaten Uploadzugang anbieten. Dieser Zugang kann ausschließlich SFTP verwenden, ist in `/var/lib/thesis-deploy` eingesperrt und hat keine interaktive Shell. Ein Upload allein startet **nie** einen Deploy.

> Erst die separate Freigabedatei `DEPLOY.ready` startet den kontrollierten Deploy. Der VPS prüft das Archiv, erstellt eine lokale Rückfallsicherung, baut nur den App-Container neu und führt danach den Health-Check aus.

Die einmalige Root-Einrichtung erfolgt auf dem VPS:

```bash
cd /opt/thesis-match-maker
scripts/selfhosted/setup-thesis-filezilla-deploy.sh
passwd thesis-upload
```

In FileZilla wird anschließend eine SFTP-Verbindung mit Benutzer `thesis-upload`, Server `217.154.124.8`, Port `22` und dem gesetzten Upload-Passwort eingerichtet. Als Remote-Ordner erscheint `/incoming`.

Für jeden Deploy laden Sie zuerst das aktuelle, geheimnisfreie Releasearchiv hoch und benennen es exakt in `thesis-source.zip` um. Warten Sie den vollständig erfolgreichen Upload ab. Erstellen Sie anschließend lokal eine leere Datei namens `DEPLOY.ready` und laden Sie sie in denselben Ordner hoch. Erst dieser zweite, bewusste Upload löst den Deploy aus.

Bei Erfolg verschiebt der VPS das angewendete Archiv in `/var/lib/thesis-deploy/releases`. Bei Fehlern verschiebt er Archiv und Freigabedatei nach `/var/lib/thesis-deploy/failed`, damit kein automatischer Wiederholungsversuch entsteht. Status und Fehler sind mit `journalctl -u thesis-sftp-deploy.service` einsehbar.
