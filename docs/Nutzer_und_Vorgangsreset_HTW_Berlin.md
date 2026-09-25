# Nutzer- und Vorgangsreset auf `thesis.f3.htw-berlin.de`

Diese Anleitung setzt die ausdrücklich bestätigte Variante **B – Nutzer- und Vorgangsreset** um. Sie ist ausschließlich für die zuständige HTW-Berlin-Serveradministration vorgesehen.

> **Wirkung:** Alle Nutzerkonten, Rollen, lokalen Passwörter, Passwort-Reset-Tokens, Zwei-Faktor-Daten, Thesis-Anfragen, Kolloquien, Kommentare, Uploadreferenzen, Benachrichtigungen und Auditdaten werden gelöscht. Anschließend wird ausschließlich ein neues, freigeschaltetes Superadmin-Konto angelegt. Vorher wird ein vollständiges, prüfbares Backup erstellt.

## 1. Was erhalten bleibt

| Erhalten | Wird gelöscht |
|---|---|
| Studiengänge einschließlich öffentlicher Informationen und Links | Alle Benutzerkonten, Profile, Rollen und Fachbereichszuteilungen |
| Allgemeine Semester- und Abgabefristen | Alle Thesis-Anfragen, Abstracts, Kolloquien, Planungen und Vorgangskommentare |
| E-Mail-Vorlagen und allgemeine Systemeinstellungen | Alle Authentifizierungsdaten, Loginprotokolle, Passwort-Reset- und 2FA-Codes |
| Allgemeine FAQ-/Leitfadeninhalte und anonyme Aggregate | Alle nutzerbezogenen Vorlagen, Themenvorschläge, öffentlichen Prüfer:innenressourcen und Benachrichtigungen |
| Öffentliche Studiengangsmedien | Alle referenzierten persönlichen Avatare, Profilbilder, Banner, Exposés und Vorgangsdokumente |

Die Tabellenstruktur, Docker-Volumes, Caddy-Konfiguration, SMTP-Konfiguration, Domain sowie Datenbankzugangsdaten bleiben unverändert. Die Tabellenstruktur wird nicht neu initialisiert und das MySQL-Volume wird nicht entfernt.

## 2. Vorbedingungen

1. Der aktuelle freigegebene Quellstand muss vollständig in `/opt/thesis-match-maker` liegen. Er enthält drei benötigte Dateien:
   - `scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh`
   - `scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.mjs`
   - `scripts/selfhosted/cleanup-user-storage.mjs`
2. Das Datenbankschema muss zuvor mit `repair-auth-schema.sh` geprüft und bei Bedarf repariert worden sein. Das Reset-Skript verweigert den Start bei fehlenden Kernstrukturen.
3. Die Container `db` und `app` müssen laufen. Vor dem Reset wird kein Passwort, SMTP-Wert, Token oder `.env`-Inhalt ausgegeben.
4. Die Administration bestätigt, dass das vor dem Reset erstellte Backup an einem geschützten zweiten Speicherort abgelegt wird.

Die restriktiven Rechte werden auf dem Server gesetzt:

```bash
cd /opt/thesis-match-maker
sudo chown root:root scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh
sudo chmod 750 scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh
```

## 3. Zuerst ausschließlich die Vorschau ausführen

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh --check
```

Die Vorschau gibt nur Datenmengen der zu löschenden sowie der erhaltenen Tabellen aus. Sie ändert keine Daten. Bei einem unerwarteten Datenbestand, einer falschen Datenbank oder einem nicht laufenden Container wird nicht fortgefahren.

## 4. Reset und Superadmin-Erstzugang ausführen

Nach erfolgreicher Vorschau führt die Administration den folgenden Befehl aus:

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/reset-user-data-and-bootstrap-superadmin.sh \
  --apply \
  --email holger@luetters.net \
  --name "Holger Lütters"
```

Der Befehl fordert nacheinander die zwei exakten Bestätigungen

```text
NUTZERDATEN_UND_VORGAENGE_LOESCHEN
NUR_NEUEN_SUPERADMIN_ANLEGEN
```

und anschließend ein neues Portalpasswort zweimal verdeckt an. Das Passwort muss 12 bis 128 Zeichen umfassen und mindestens drei Zeichengruppen enthalten. Es wird nicht ausgegeben, nicht als Befehlsargument übergeben und nicht in einem Log gespeichert.

Vor der Löschung erzeugt das Skript einen vollständigen Datenbank- und Dateisicherungsordner mit Prüfsummen unter `/opt/thesis-match-maker/backups/user-data-reset-<zeitstempel>/`. Das Skript prüft die Sicherung vor der Löschung. Persönliche Speicherobjekte werden ausschließlich anhand ihrer bisherigen Datenbankreferenzen entfernt; öffentliche Studiengangsmedien bleiben erhalten.

## 5. Zwei-Faktor-Authentifizierung

Der Reset entfernt alle bisherigen 2FA-Geheimnisse und Wiederherstellungscodes, weil sämtliche Konten gelöscht werden. Zusätzlich setzt er die globale Konfiguration `twoFactorRequiredRoles` auf `[]`. Das neue Superadmin-Konto benötigt daher zunächst keinen zweiten Faktor. Die Administration kann 2FA nach der technischen und fachlichen Abnahme im Superadmin-Bereich erneut verbindlich konfigurieren.

## 6. Nachkontrolle

Nach der Erfolgsmeldung prüft die Administration:

```bash
cd /opt/thesis-match-maker
sudo docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/
sudo scripts/selfhosted/verify-server-readonly.sh \
  --account-email holger@luetters.net
```

Die erwartete Kontoprüfung zeigt genau ein Konto mit Rolle `superadmin`, Status `approved`, Loginart `password` und vorhandenem Passwort. Danach erfolgt die erste Anmeldung nur über `https://thesis.f3.htw-berlin.de/login`.

## 7. Grenzen und Rückfall

Der Reset ist nach der zweiten Serverbestätigung absichtlich weitreichend. Das neue Superadmin-Konto ist der einzige verbleibende Zugang. Ein Rückfall kann ausschließlich durch die zuständige Administration aus dem vorab geprüften Backup und gemäß dem dokumentierten Wiederherstellungsprozess erfolgen. Es dürfen weder `docker compose down -v` noch `--initialize-empty-database`, `drizzle-kit push --force` oder manuelle Pauschalbefehle zum Löschen der Datenbank verwendet werden.
