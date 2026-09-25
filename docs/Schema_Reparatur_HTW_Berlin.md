# Datenbewahrende Schema-Reparatur auf `thesis.f3.htw-berlin.de`

Diese Anleitung behebt einen **Schemaunterschied** zwischen dem aktuellen Thesis-Match-Maker-Code und einer bereits vorhandenen MySQL-Datenbank. Das typische Symptom lautet beim Anmelden `Failed query: select ... from users`, noch bevor Passwort oder Zwei-Faktor-Authentifizierung geprüft werden.

> Die Reparatur ergänzt ausschließlich fehlende Spalten und Hilfstabellen für Passwortlogin, Rollen und Zwei-Faktor-Authentifizierung. Sie führt **keine** historischen Drizzle-Migrationen aus, initialisiert keine leere Datenbank, löscht keine Tabellen, Konten, Thesis-Fälle, Dateien oder Kennwörter und verändert weder SMTP, DNS noch Firewall.

## 1. Voraussetzung: aktuelles Reparaturwerkzeug bereitstellen

Die Datei `scripts/selfhosted/repair-auth-schema.sh` muss aus dem aktuellen freigegebenen Quellstand `main` in `/opt/thesis-match-maker/scripts/selfhosted/` liegen. Sie kann zusammen mit dem vollständigen, geprüftem Release über den kontrollierten Deployweg übertragen werden oder durch die HTW-Berlin-Administration als einzelne, überprüfte Datei bereitgestellt werden.

Auf dem Server setzt die Administration die restriktiven Rechte:

```bash
cd /opt/thesis-match-maker
sudo chown root:root scripts/selfhosted/repair-auth-schema.sh
sudo chmod 750 scripts/selfhosted/repair-auth-schema.sh
```

## 2. Ausschließlich lesende Vorprüfung

Zuerst wird nur festgestellt, welche der benötigten Spalten und Tabellen fehlen. Dieser Befehl ändert nichts und gibt keine Geheimwerte aus.

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-auth-schema.sh --check
```

Die Administration hält daraus nur Folgendes fest: aktive Datenbank, vorhandene Tabellen, die ausgegebenen Zeilen für die `users`-Spalten, Migrationsstatus, Rollenanzahlen sowie die Anzahl leerer technischer Kennungen. Kennwörter, Hashes, SMTP-Werte und der Inhalt von `deploy/.env` bleiben vertraulich.

### Abbruchkriterien

Die Reparatur wird **nicht** ausgeführt, wenn der Datenbankcontainer nicht läuft, wenn die Vorprüfung unerwartet mehrere Datenbanken oder eine falsche Datenbank anzeigt oder wenn unklar ist, ob die aktuelle Datenbasis übernommen oder neu aufgebaut werden sollte. In diesen Fällen wird zuerst der Datenübernahme- und Wiederherstellungsstand geklärt.

## 3. Additive Reparatur mit verpflichtendem Backup

Erst nach erfolgreicher Vorprüfung führt die Administration die Reparatur aus. Das Werkzeug erstellt vor jeder DDL-Änderung eine vollständige Datenbank- und Dateisicherung mit Prüfsummen und prüft diese direkt anschließend.

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-auth-schema.sh \
  --apply \
  --confirm SCHEMA_REPARATUR_NACH_BACKUP
```

Optional kann ein zuvor angelegter, absoluter Backup-Pfad gewählt werden:

```bash
sudo scripts/selfhosted/repair-auth-schema.sh \
  --apply \
  --confirm SCHEMA_REPARATUR_NACH_BACKUP \
  --backup-dir /opt/thesis-match-maker/backups/schema-repair-20260925T090000Z
```

Das Werkzeug legt bei Bedarf unter anderem die fehlenden Felder der Tabelle `users`, die Tabellen `user_roles`, `login_attempts`, `password_reset_tokens`, `two_factor_recovery_codes`, `system_settings` und `audit_log` an. Für auditierbare Systemereignisse ohne konkreten Thesis-Fall wird `audit_log.thesisRequestId` additiv auf einen zulässigen Nullwert angepasst. Vorhandene Rollen werden in das Mehrrollenmodell übernommen, ohne bestehende Rollen zu entfernen oder zu überschreiben. Fehlende technische `openId`-Werte historischer Datensätze erhalten ausschließlich eine interne `legacy_<id>`-Kennung.

## 4. Technische Kontrolle nach der Reparatur

Nach einer Erfolgsmeldung prüft die Administration zuerst die Anwendung lokal:

```bash
cd /opt/thesis-match-maker
sudo docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/
sudo scripts/selfhosted/repair-auth-schema.sh --check
```

Danach wird der Kontoabgleich weiterhin rein lesend ausgeführt:

```bash
sudo scripts/selfhosted/verify-server-readonly.sh \
  --account-email holger@luetters.net
```

Erst wenn die Abfrage der Tabelle `users` wieder ohne Schemafehler möglich ist, wird der kontrollierte Superadmin-Erstzugang oder die Wiederherstellung gemäß [Superadmin_Erstzugang_HTW_Berlin.md](./Superadmin_Erstzugang_HTW_Berlin.md) durchgeführt. Für das gewählte Szenario wird nur dieses einzelne Superadmin-Konto und dessen Zwei-Faktor-Konfiguration zurückgesetzt.

## 5. Fehlgeschlagene Reparatur

Bei einem Fehler beendet das Werkzeug den Vorgang. Es werden keine Löschbefehle ausgeführt. Der vorab erzeugte Sicherungsordner verbleibt unter `/opt/thesis-match-maker/backups/` und wird ausschließlich nach den dokumentierten Wiederherstellungsregeln verwendet. Nicht eigenmächtig `docker compose down -v`, `--initialize-empty-database`, `drizzle-kit push --force` oder pauschale SQL-Befehle anwenden.
