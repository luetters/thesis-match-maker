# Administrator-Übergabe: verbleibende Produktionsschritte

Dieses Dokument trennt bewusst die bereits vorbereitete Anwendung von den Schritten, die ausschließlich durch die zuständige Administration auf dem Ubuntu-Zielserver erfolgen dürfen. Es ersetzt keine Freigabe für Datenimport, Passwortversand, DNS-Änderung oder Go-live.

> **Grundsatz:** Niemals echte Passwörter, private SSH-Schlüssel, SMTP-Daten, Tokens oder Inhalte der Datei `deploy/.env` in Git, GitHub Actions, Tickets oder Chatnachrichten einfügen.

## 1. Was bereits vorbereitet ist

| Bereich | Bereitgestellter Stand | Noch durch Administration auszuführen |
|---|---|---|
| GitHub-Deploy | Manueller, auf `main` begrenzter Workflow mit geschütztem Environment | GitHub-Secrets und Environment-Freigabe einrichten |
| Ubuntu-Start | Idempotentes Bootstrap- und Startskript | Ubuntu, Docker, Verzeichnisrechte und `deploy/.env` einrichten |
| Betriebsdiagnose | Lesendes Diagnosewerkzeug ohne Ausgabe von Geheimnissen | Auf dem Zielserver ausführen und Ergebnis intern bewerten |
| Superadmin-Erstzugang | Doppelt bestätigtes lokales Werkzeug mit verdeckter Passwortabfrage | Zuerst den Kontostatus prüfen, dann gegebenenfalls einen einzelnen Erstzugang oder eine Wiederherstellung durchführen |
| Datenübernahme | Portabler Import sowie Backup-/Restore-Werkzeuge vorhanden | Datenquelle, Zielsystem und Wiederherstellungsweg fachlich freigeben |
| E-Mail und Konten | Einzel- und Massen-Reset sind bewusst gesperrt vorbereitet | Versand erst nach Go-live-Abnahme ausdrücklich freigeben |

## 2. Einmaliger Server-Check

Nach der Codeübernahme wird die Diagnose als Root ausgeführt. Der optionale E-Mail-Parameter prüft lediglich Rolle, Freigabestatus, Loginart und das Vorhandensein eines Passwort-Hashs. Er gibt weder Passwort noch Hash, Token oder SMTP-Konfiguration aus.

```bash
cd /opt/thesis-match-maker
sudo chmod 750 scripts/selfhosted/verify-server-readonly.sh
sudo scripts/selfhosted/verify-server-readonly.sh \
  --account-email holger.luetters@htw-berlin.de
```

Die Administration hält aus der Ausgabe nur die folgenden Ergebnisse fest: Containerstatus, HTTP-Status, vorhandene Releaseablage, aktivierte FileZilla-Deploy-Units sowie die angezeigten Kontometadaten. Bei einem HTTP-Status ungleich `200` oder nicht laufenden Containern darf kein Passwort-Reset und keine DNS-Änderung ausgelöst werden.

Für eine neue Installation ohne Superadmin-Datensatz oder für die kontrollierte Wiederherstellung eines einzelnen vorhandenen Kontos gilt ausschließlich die Anleitung [Superadmin_Erstzugang_HTW_Berlin.md](./Superadmin_Erstzugang_HTW_Berlin.md). Sie verlangt eine doppelte lokale Bestätigung und gibt weder Kennwörter noch Hashes aus.

Wenn die Anmeldung schon beim Lesen der Tabelle `users` mit `Failed query: select ... from users` scheitert, ist dies ein Schemafehler vor der Passwort- oder Zwei-Faktor-Prüfung. In diesem Fall werden weder Konten angelegt noch Kennwörter zurückgesetzt; die Administration folgt zuerst der datenbewahrenden [Schema_Reparatur_HTW_Berlin.md](./Schema_Reparatur_HTW_Berlin.md).

## 3. Reihenfolge für den ersten Produktivstart

Die folgenden Schritte werden nacheinander und nur mit der jeweiligen fachlichen Freigabe ausgeführt.

| Reihenfolge | Verantwortlich | Aktion | Stop-Kriterium |
|---|---|---|---|
| 1 | Administration | Ubuntu, Docker Compose und geschützte `deploy/.env` einrichten | Fehlende Pflichtwerte oder falsche Dateirechte |
| 2 | Administration | Manuellen GitHub-Actions-Deploy oder kontrollierten FileZilla-Deploy starten | Build- oder lokaler Health-Check fehlerhaft |
| 3 | Administration | Lesendes Diagnosewerkzeug aus Abschnitt 2 ausführen | Container, Datenbank oder HTTP nicht gesund |
| 4 | Fachliche Abnahme | Rollenabläufe und deutsche/englische Oberflächen prüfen | Fehler in Rollen- oder Sprachablauf |
| 5 | Fachliche Freigabe | Einzelne Reset-E-Mail oder Pilotversand ausdrücklich freigeben | Keine explizite Versandfreigabe |
| 6 | DNS-Verantwortung | Caddy, TLS und DNS aktivieren | Keine dokumentierte Go-live-Freigabe |

## 4. Kontodiagnose ohne Reset

Bei einem vermeintlich ausgesperrten Konto wird ausschließlich der lesende Kontocheck verwendet. Das Ergebnis ist wie folgt zu bewerten:

| Befund | Zulässiger nächster Schritt |
|---|---|
| Kein Datensatz | Keine Neuregistrierung auslösen; Duplikate und Importstand prüfen |
| `roleStatus` nicht `approved` | Fachlich zuständige Freigabe prüfen |
| Passwort nicht hinterlegt | Nur nach ausdrücklicher Einzel-Freigabe den vorgesehenen Resetweg verwenden |
| Mehrere Datensätze | Passwortkonto und historische Referenzen prüfen; keine Rolle überschreiben |
| Passwort hinterlegt, Login schlägt fehl | Ausschließlich mit Zustimmung einen Einzel-Reset starten; niemals Passwort oder Hash auslesen |

## 5. Bewusst noch nicht ausgeführte Schritte

Die folgenden Aufgaben bleiben extern, da sie reale Produktionsdaten, E-Mail-Empfänger, Netzwerkänderungen oder den Ubuntu-Zielserver betreffen: Datenimport und Wiederherstellungsprobe, Versand von Passwort-Reset-E-Mails, Abnahme der produktiven Rollenabläufe, Caddy-/TLS-Aktivierung, DNS-Änderung sowie die öffentliche Go-live-Freigabe.

Die detaillierte GitHub-Servervorbereitung steht in [GitHub_Ubuntu_Deploy.md](./GitHub_Ubuntu_Deploy.md). Die allgemeine Ubuntu-Bereitstellung einschließlich Backup und Rollback steht in [HTW_Berlin_Ubuntu_Bereitstellung.md](./HTW_Berlin_Ubuntu_Bereitstellung.md).
