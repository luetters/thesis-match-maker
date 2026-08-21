# Portabler Import und Export des Thesis Match Maker

## Zweck und Geltungsbereich

Die Transferverwaltung steht ausschließlich Superadmins im Tab **Datenübernahme** zur Verfügung. Sie erzeugt ein versioniertes ZIP-Archiv für eine kontrollierte Umzugs- oder Wiederherstellungssituation. Das Archiv umfasst fachliche Daten des Thesis Match Maker sowie die referenzierten Profilbilder, Exposés und geschützten Dokumente.

| Bereich | Enthalten | Nicht enthalten |
|---|---|---|
| Nutzer:innen und Rollen | Stammdaten, Fachbereichs- und Rollenbeziehungen | Passworthashes, Sitzungen, OpenIDs, TOTP-Geheimnisse, Wiederherstellungscodes |
| Stammdaten | Studiengänge, Fachbereiche, Kapazitäten, Fristen | Infrastruktur- und Datenbankeinstellungen |
| Abschlussarbeiten | Anträge, Betreuung, Zweitprüfung, Sperrvermerk, Abstracts, Status- und Matchingverlauf | Aktive Einladungs- und Aktionstoken |
| Kommunikation | Bearbeitbare E-Mail- und Erinnerungsvorlagen | SMTP-Zugangsdaten |
| Dateien | Referenzierte Avatare, Exposés und Dokumente mit Prüfsummen | S3-/Objektspeicherzugänge |

## Export

Der Superadmin erzeugt einen sicheren Download. Der Link ist einmalig und fünf Minuten gültig. Das ZIP wird unmittelbar gestreamt und nicht als dauerhafte Serverdatei abgelegt. Das Archiv enthält `manifest.json`, JSON-Dateien unter `records/`, Dateien unter `assets/` sowie eine `README.md`.

Das Manifest enthält Archiv-ID, Formatversion, Zeitstempel, Zeilenzahlen, SHA-256-Prüfsummen und eine Liste der bewusst ausgeschlossenen Schutzdaten. Das Archiv muss verschlüsselt gespeichert und mindestens an einem zweiten sicheren Ort abgelegt werden.

## Vorschauimport

Vor jeder Datenübernahme lädt ein Superadmin das Archiv hoch und startet die Vorschau. Das System prüft dabei die Archivversion, Pfade, Zeilenzahlen, Prüfsummen und die Zahl der referenzierten Dateien. Ungültige Archive, manipulierte Datensektionen oder Pfadangriffe werden abgewiesen. Die Vorschau speichert weder das Archiv noch Daten auf dem Server.

## Finaler Import

Der finale Import ist absichtlich restriktiv. Er erfordert gleichzeitig ein gültiges Archiv, den eingegebenen Text `IMPORTIEREN`, einen auf dem Zielserver gesetzten `TRANSFER_IMPORT_TOKEN` sowie eine leere Zielumgebung ohne Nutzer:innen und Abschlussarbeitsanträge. Damit ist ein Überschreiben produktiver Daten ausgeschlossen.

Dateien werden vor dem Datenbankimport mit ihren SHA-256-Prüfsummen abgeglichen und in den konfigurierten Zielspeicher übernommen. Die fachlichen Tabellen werden anschließend in einer festen Abhängigkeitsreihenfolge in einer Datenbanktransaktion angelegt. Der erfolgreiche Import wird im Audit-Log protokolliert.

> Importierte Konten erhalten bewusst keine übertragenen Passwörter oder Zwei-Faktor-Geheimnisse. Nach einem Umzug müssen Nutzer:innen über den vorgesehenen Passwort-zurücksetzen-Prozess ein neues Passwort vergeben. Vor dem Produktivstart ist deshalb ein funktionsfähiger SMTP-Versand zu prüfen.

## Zielserver vorbereiten

Auf dem Zielserver wird der Import-Schlüssel ausschließlich in der geschützten Umgebungsdatei gesetzt. Der Schlüssel darf nicht in Git, in Dokumentation oder in E-Mail-Nachrichten erscheinen.

```bash
openssl rand -hex 32
# Ergebnis ausschließlich in deploy/.env eintragen:
# TRANSFER_IMPORT_TOKEN=<generierter Wert>
chmod 600 deploy/.env
```

Vor dem finalen Import sind ein Datenbank-Backup der leeren Zielumgebung, die Importvorschau, ein SMTP-Test und ein dokumentierter Rückfallpunkt erforderlich. Die Domain wird erst nach fachlicher Abnahme, Passwortreset-Test und Prüfung der Dateien umgestellt.

## Lokaler Bootstrap-Import auf einem neuen VPS

Vor dem ersten Login existiert auf einer leeren Zielumgebung noch kein Superadmin. Für diesen Sonderfall stellt `scripts/selfhosted/bootstrap-portable-import.sh` den Import über den lokalen Loopback-Port bereit. Das Skript übernimmt das Archiv unverändert, startet den Anwendungscontainer ohne Caddy und übergibt die ZIP-Datei an den Bootstrap-Endpunkt. Manuelles Entpacken ist weder erforderlich noch zulässig.

Der Bootstrap-Endpunkt akzeptiert ausschließlich Verbindungen von `127.0.0.1` oder `::1`, verlangt `TRANSFER_IMPORT_TOKEN` und die feste Bestätigung `BOOTSTRAP_IMPORT`. Danach gelten dieselben Archiv-, Prüfsummen-, Leerdatenbank- und Assetprüfungen wie beim webbasierten Import. Importierte Konten müssen ihr Passwort zurücksetzen, bevor die öffentliche Domain aktiviert wird.

### Verbindliche Vorschau vor dem Import

Vor dem finalen Import muss auf dem Zielserver folgende Vorschau laufen:

```bash
scripts/selfhosted/bootstrap-portable-preview.sh /tmp/thesis-transfer.zip
```

Die Vorschau validiert das Manifest, jede Datensektion und jede Prüfsumme, zählt referenzierte Dateien und bestätigt, dass die Datenbank keine Nutzer:innen oder Abschlussarbeitsanträge enthält. Sie schreibt keine Daten. Erst wenn die Antwort `"valid": true` und `"targetIsEmpty": true` enthält, darf eine dafür berechtigte Person den finalen Bootstrap-Import ausdrücklich freigeben.
