# Exportfenster und Abnahmeprotokoll

**System:** Thesis Match Maker für die HTW Berlin  
**Zweck:** Kontrollierter Datenexport und Wiederherstellungstest vor einem späteren Umzug  
**Grundsatz:** Keine Domainumschaltung und kein produktiver Eingriff ohne dokumentiertes Go.

## 1. Rollen und Entscheidung

| Rolle | Aufgabe im Exportfenster | Freigabe erforderlich |
|---|---|---|
| Superadmin | Zielserver, geheime Konfiguration und verschlüsselten Ablageort verantworten | Ja |
| Verwaltung | Fachlichen Änderungsstopp koordinieren und Stichproben abnehmen | Ja |
| Technische Durchführung | Vorprüfung, Sicherung, Prüfsummen, Testwiederherstellung und Betriebscheck durchführen | Ja |
| Domainverantwortliche Person | DNS erst nach dokumentierter Abnahme umstellen | Ja |

Alle vier Rollen können durch dieselbe Person wahrgenommen werden, wenn die Verantwortlichkeit schriftlich festgehalten wird. Zugangsdaten, Passwörter und Zwei-Faktor-Wiederherstellungscodes werden nicht in dieses Protokoll, in den Chat oder in GitHub eingetragen.

## 2. Empfohlenes Exportfenster

Planen Sie ein Wartungsfenster außerhalb der üblichen Arbeitszeit. Die tatsächliche Dauer hängt von Datenbank-, Datei- und S3-Umfang ab. Während des Fensters werden keine Rollenfreigaben, Friständerungen, Uploads, Kolloquiumsbestätigungen oder Konfigurationsänderungen vorgenommen.

| Zeit | Schritt | Ergebnis |
|---|---|---|
| T−7 Tage | Zielserver, Sicherungsort und Verantwortlichkeiten bestätigen | Vorbereitung freigegeben |
| T−2 Tage | Docker-Stack ohne Produktivdaten starten; `preflight-export.sh` ausführen | Zielserver technisch bereit |
| T−1 Tag | Fachbereiche über geplanten Änderungsstopp informieren | Keine offenen Zuständigkeiten |
| T−0 | Letzte vollständige Momentaufnahme und lokaler Backup-Lauf | Prüfsummen und Exportmanifest vorhanden |
| T+0 bis T+1 | Wiederherstellung auf dem isolierten Ziel und fachliche Stichprobe | Go oder No-Go dokumentiert |
| Erst nach Go | DNS und Domainbindung umstellen | Neuer Betrieb freigegeben |

> Ein Export ist eine Momentaufnahme. Daten, Dateien oder Änderungen nach dieser Aufnahme sind nicht im Export enthalten. Für ein laufendes Portal ist deshalb eine letzte frische Sicherung unmittelbar vor dem Umzug erforderlich.[1]

## 3. Technisches Abnahmeprotokoll

Füllen Sie die Tabelle erst auf dem Zielserver aus. Ein fehlgeschlagener Punkt führt zu **No-Go**.

| Prüfung | Nachweis | Status |
|---|---|---|
| Vorprüfung ohne Fehler | `export-preflight/export-preflight.txt` | ☐ Offen / ☐ Erfüllt |
| Datenbankdump lesbar | `verify-backup.sh` erfolgreich | ☐ Offen / ☐ Erfüllt |
| Archiv des lokalen Dateispeichers lesbar | `verify-backup.sh` erfolgreich | ☐ Offen / ☐ Erfüllt |
| Prüfsummen vollständig | `SHA256SUMS` ohne Fehler geprüft | ☐ Offen / ☐ Erfüllt |
| Geheimnisfreies Exportmanifest vorhanden | `EXPORT-MANIFEST.md` | ☐ Offen / ☐ Erfüllt |
| Verschlüsselte Zweitkopie vorhanden | Separater Speicherort, Passwort getrennt verwahrt | ☐ Offen / ☐ Erfüllt |
| Wiederherstellung auf Testsystem durchgeführt | `restore.sh` mit dokumentiertem Testziel | ☐ Offen / ☐ Erfüllt |
| HTTPS, E-Mail und Scheduler geprüft | `verify-deployment.sh` und Betriebsprotokoll | ☐ Offen / ☐ Erfüllt |

## 4. Fachliche Abnahmeprotokoll

Die Prüfung erfolgt mit einer kleinen, autorisierten Stichprobe. Die Personen- und Falldaten werden nicht in diesem Dokument selbst notiert; verwenden Sie interne Referenznummern.

| Bereich | Mindestprüfung | Status |
|---|---|---|
| Anmeldung | Passwort-Login und verpflichtende Zwei-Faktor-Authentifizierung | ☐ Offen / ☐ Erfüllt |
| Rollen | Studierende, Erstprüfer:innen, Zweitprüfer:innen und Verwaltung sehen nur erlaubte Daten | ☐ Offen / ☐ Erfüllt |
| Thesis-Fälle | Status, Fristen und Historie in repräsentativen Fällen vorhanden | ☐ Offen / ☐ Erfüllt |
| Vertraulichkeit | Sperrvermerke und geschützte Dokumente bleiben berechtigungsgebunden | ☐ Offen / ☐ Erfüllt |
| Öffentliche Inhalte | Freigegebene Abstracts sichtbar; vertrauliche Inhalte ausgeschlossen | ☐ Offen / ☐ Erfüllt |
| Kommunikation | Test-E-Mail erfolgt; keine produktiven Sammelmails ausgelöst | ☐ Offen / ☐ Erfüllt |

## 5. Go-/No-Go-Entscheidung

| Entscheidung | Voraussetzung | Nächste Aktion |
|---|---|---|
| **Go** | Alle technischen und fachlichen Prüfungen erfüllt, Sicherheitskopie und Rückfallpunkt vorhanden | DNS nach Plan umstellen und 24 Stunden verstärkt überwachen |
| **No-Go** | Mindestens eine Prüfung offen oder fehlerhaft | Domain unverändert lassen, Fehler auf dem isolierten Ziel beheben und erneut testen |

**Entscheidung:** ☐ Go  ☐ No-Go  
**Datum/Uhrzeit (UTC):** ____________________  
**Freigabe Superadmin:** ____________________  
**Freigabe Verwaltung:** ____________________  
**Technische Durchführung:** ____________________

## 6. Rückfall

Bei einem No-Go bleibt die bisherige produktive Domain unverändert. Bei einem Fehler nach DNS-Wechsel wird der vorher dokumentierte DNS-Wert wiederhergestellt und die neue Umgebung für Analysezwecke isoliert. Die verschlüsselte Sicherung bleibt unangetastet, damit eine erneute Wiederherstellung möglich ist.

## Referenzen

[1] [Manus: Datensicherung und Wiederherstellung für Websites](https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data)
