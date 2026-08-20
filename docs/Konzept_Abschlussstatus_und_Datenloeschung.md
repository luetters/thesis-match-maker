# Konzept: Abschlussstatus „Thesis defended“ und datensparsame Löschung

**Organisation:** HTW Berlin  
**Status:** Arbeitsentwurf zur fachlichen und datenschutzrechtlichen Freigabe  
**Version:** 1.0

> **Hinweis:** Ich bin keine Rechtsberatung. Dieses Konzept ist eine technische und organisatorische Arbeitsgrundlage. Vor einer produktiven Löschung muss die Prüfungsverwaltung gemeinsam mit Datenschutzbeauftragten und Rechtsstelle verbindlich festlegen, welche Prüfungs- und Nachweisdaten außerhalb bzw. innerhalb des Portals wie lange benötigt werden.

## 1. Ziel und Leitentscheidung

Nach einer erfolgreich durchgeführten Verteidigung ist der persönliche Betreuungsfall für die operative Arbeit im Portal regelmäßig nicht mehr erforderlich. Die detaillierte Anfrage, Kontaktdaten, Unterlagen, Notizen, Terminabstimmungen und Kollaborationsdaten sollen daher nicht dauerhaft im Thesis-Matching-System verbleiben. Für Erstprüfer:innen bleibt lediglich ein minimaler eigener Nachweis erhalten: **Name, Matrikelnummer, Titel der Arbeit und zugehöriges Semester**.

Der vorgeschlagene Status **„Thesis defended“** trennt den fachlichen Abschluss der Verteidigung von der datensparsamen Bereinigung des Matching-Systems. Er darf nicht stillschweigend als Ersatz für die amtliche Prüfungsakte verstanden werden. Die HTW Berlin beschreibt die Zulassung, Abgabe und prüfungsbezogenen Unterlagen als Prozesse der Prüfungsverwaltung; außerdem bestehen Vorgaben zur Dokumentation erfolgreicher Abschlussarbeiten. [1] [2]

Der Entwurf folgt dem Grundsatz, personenbezogene Daten nur so lange zu speichern, wie es für den festgelegten Zweck erforderlich ist. [3] Zugleich verhindert er, dass eine Erstprüferin oder ein Erstprüfer allein eine möglicherweise noch erforderliche amtliche Prüfungsdokumentation löscht.

| Bereich | Zielzustand nach Abschluss |
|---|---|
| Aktive Arbeitsansicht | Der Fall erscheint nicht mehr in aktiven Listen von Studierenden, Zweitprüfer:innen und Verwaltung. |
| Nachweis für Erstprüfer:in | Sichtbar bleibt nur Name, Matrikelnummer, Titel und Semester in einer eigenen, geschlossenen Nachweisliste. |
| Personenbezogene Falldaten | Werden nach den Freigaberegeln aus dem Matching-System entfernt oder technisch entkoppelt. |
| Abstract | Bleibt nur als eigenständiger, geprüfter und nicht rückverfolgbar verknüpfter anonymisierter Inhalt erhalten. |
| Amtliche Prüfungsakte | Bleibt vollständig außerhalb des Matching-Systems bei der zuständigen Prüfungsverwaltung. |

## 2. Fachlicher Ablauf und neuer Status

Der Status **„Thesis defended“** wird nicht beim bloßen Eintragen eines Kolloquiumtermins erreicht, sondern erst nachdem die Verteidigung tatsächlich stattgefunden hat. Im Portal existieren bereits getrennte Zustände für die Verteidigungsfähigkeit und für abgeschlossene Kolloquien. Der neue Abschlussstatus soll darauf aufbauen, nicht diese Prüfungen ersetzen.

Der Erstprüfer oder die Erstprüferin initiiert den Abschluss über einen Button **„Verteidigung abschließen und Fall bereinigen“**. Dieser Button ist erst aktiv, wenn alle folgenden Bedingungen erfüllt sind:

| Vorbedingung | Technische Prüfung |
|---|---|
| Erst- und Zweitprüfung sind vollständig zugeordnet | Erst- und Zweitprüfer-ID vorhanden |
| Verteidigungsfähigkeit wurde durch die Verwaltung bestätigt | `defenseEligibility = approved` |
| Kolloquium wurde als durchgeführt markiert | Zugehöriger Kolloquiumstermin hat Status `COMPLETED` |
| Kein aktiver Einspruch, Sperrvermerk oder offener Prüfungsfall | Kein `legalHold` und kein offener Verwaltungsstatus |
| Amtliche Akte wurde in den vorgesehenen Verwaltungsprozess überführt | `officialRegistrationStatus = case_closed` oder explizite Verwaltungsbestätigung |

Nach dem Auslösen sieht die Erstprüferin oder der Erstprüfer eine verbindliche Zusammenfassung der Folgen. Erst nach einer zweiten Bestätigung wird der Fall in den Status `THESIS_DEFENDED` überführt. Diese Aktion erzeugt einen Audit-Eintrag ohne Thesis-Titel, Namen oder Matrikelnummer im Freitext.

> **Wichtige Rollenregel:** Erstprüfer:innen dürfen den Abschluss anstoßen. Die tatsächliche Datenminimierung wird nur durchgeführt, wenn die oben genannten Sperren und die von der HTW Berlin festgelegte Aufbewahrungsregel erfüllt sind. Superadmins oder die zuständige Verwaltung können einen begründeten Sperrvermerk setzen; dieser blockiert die Bereinigung.

## 3. Empfohlenes Datenmodell

Die Umsetzung soll nicht über ein unkontrolliertes Löschen aus `thesis_requests` erfolgen. Stattdessen wird eine atomare Abschlussroutine eingeführt, die einen minimalen Nachweis erzeugt, verknüpfte operative Daten bereinigt und den anonymisierten Abstract technisch abtrennt.

### 3.1 Neue Status- und Steuerfelder

| Feld | Zweck | Sichtbarkeit |
|---|---|---|
| `status = THESIS_DEFENDED` | Fachlicher Abschluss des Matching-Falls | Erstprüfer:in, Verwaltung, Superadmin |
| `defendedAt` | Zeitpunkt der bestätigten Verteidigung | Minimaler Abschlussnachweis |
| `defendedBy` | Auslösende Erstprüfer:innen-ID | Audit und Berechtigungsprüfung |
| `minimizationState` | `pending`, `completed` oder `legal_hold` | Verwaltung und Superadmin |
| `legalHoldReason` | Begründung eines Sperrvermerks | Nur Verwaltung und Superadmin |
| `minimizedAt` | Zeitpunkt der erfolgreichen Bereinigung | Audit ohne Falldetails |

### 3.2 Minimale Nachweisliste für Erstprüfer:innen

Eine neue Tabelle `examiner_thesis_completion_records` enthält ausschließlich die für den gewünschten Nachweis erforderlichen Angaben. Sie ist über die Erstprüfer:innen-ID berechtigt und nicht als öffentliches Profil oder globale Suchquelle verfügbar.

| Feld | Inhalt | Begründung |
|---|---|---|
| `id` | Technischer Schlüssel | Datenintegrität |
| `firstExaminerId` | ID der Erstprüferin bzw. des Erstprüfers | Zugriff nur auf eigene Nachweise |
| `studentName` | Name der Person | Vom Nutzer gewünschter Nachweis |
| `matrikelNr` | Matrikelnummer | Vom Nutzer gewünschter Nachweis |
| `thesisTitle` | Titel der Arbeit | Vom Nutzer gewünschter Nachweis |
| `semester` | Zugehöriges Semester | Vom Nutzer gewünschter Nachweis |
| `defendedAt` | Datum der Verteidigung | Nachvollziehbarer Abschlusszeitpunkt |
| `createdAt` | Technischer Zeitpunkt der Nachweisbildung | Auditierbarkeit |

Die Tabelle enthält **keine** E-Mail-Adresse, Telefonnummer, Anschrift, Profilfoto, Biografie, Exposé, Abgabedokumente, privaten Notizen, Zweitprüfer:innen-Daten, Raumdaten oder detaillierte Bearbeitungshistorie. Eine Änderungs- oder Exportfunktion für die Nachweisliste ist nur nach einer gesonderten fachlichen Entscheidung vorzusehen.

### 3.3 Anonymisierte Abstract-Ablage

Das ursprüngliche Abstract darf nicht einfach kopiert und als „anonym“ bezeichnet werden. Freitext kann Namen, Matrikelnummern, Unternehmen, Personen oder andere identifizierende Angaben enthalten. Daher wird ein zweistufiges Verfahren empfohlen.

| Schritt | Regel |
|---|---|
| 1. Vorprüfung | Automatische Warnung bei E-Mail-Adressen, Matrikelnummern, Namenmustern und direkten Personenbezügen. |
| 2. Fachliche Freigabe | Erstprüfer:in oder Verwaltung prüft den Text vor der Ablage und bestätigt die Anonymisierung. |
| 3. Technische Trennung | Speicherung in `anonymized_thesis_abstracts` ohne `studentId`, `thesisRequestId`, Prüfer:innen-IDs oder direkte Fremdschlüssel. |
| 4. Veröffentlichung | Nur nach separater, dokumentierter Entscheidung; interne statistische Nutzung und öffentliche Veröffentlichung bleiben getrennte Zwecke. |

Die HTW-Berlin-Satzung zur Dokumentation erfolgreicher Abschlussarbeiten unterscheidet zwischen Dokumentationsdaten und personenbezogenen Angaben; sie nennt für eine Veröffentlichung personenbezogener Namen ein besonderes Zustimmungserfordernis. [2] Das Konzept übernimmt diese Trennung: Ein anonymisierter Abstract ist nicht automatisch ein veröffentlichungsfreier Inhalt. Insbesondere Unternehmensbezug oder Vertraulichkeit müssen weiterhin berücksichtigt werden. Die HTW Berlin weist ebenfalls darauf hin, dass Abschlussarbeiten vertraulich gekennzeichnet werden können. [1]

## 4. Was bei der Bereinigung entfernt wird

Die Abschlussroutine arbeitet transaktional. Entweder werden der Minimalnachweis, die anonymisierte Abstract-Ablage und die Bereinigung vollständig durchgeführt, oder es wird keine Teilbereinigung gespeichert. Dokumente im Objektspeicher werden nur gelöscht, wenn die amtliche Prüfungsverwaltung bestätigt hat, dass sie nicht mehr als Portal-Kopie benötigt werden.

| Datenkategorie | Maßnahme im Matching-System | Hinweis |
|---|---|---|
| Antrag und Detailbeschreibung | Löschen nach erfolgreicher Minimalnachweisbildung | Keine spätere Anzeige im Matching-Portal |
| Exposé, Zulassungs-PDF und Studierendendokumente | Zugriffsverweise entfernen; Objekte gemäß verbindlicher Speicherregel löschen | Amtliche Ablage bleibt getrennt |
| Private Notizen | Löschen | Keine Übernahme in Nachweisliste |
| Terminabstimmung, Verfügbarkeiten, Räume und Online-Links | Löschen | Kein Zweck nach Abschluss des Termins |
| Zugeordnete Zweitprüfer:innen im Matching-Fall | Löschen | Kein Nachweisfeld in der gewünschten Erstprüfer:innenliste |
| Audit-Log mit Falldetails | Personenbeziehbare Verknüpfung entfernen; nur minimierten Löschvorgang nach Regel aufbewahren | Audit darf die Löschung nicht faktisch rückgängig machen |
| Abstract | Nur geprüfte, anonymisierte Kopie behalten | Kein Fremdschlüssel zum ursprünglichen Fall |

## 5. Berechtigungen und Sperrvermerke

Die folgende Matrix verhindert, dass sensible Abschlüsse oder amtliche Prozesse allein durch eine Person aufgehoben werden.

| Aktion | Erstprüfer:in | Zweitprüfer:in | Verwaltung des Fachbereichs | Superadmin |
|---|---|---|---|---|
| Abschluss als „Thesis defended“ anstoßen | Ja, bei erfüllten Vorbedingungen | Nein | Nein | Nein, außer Vertretungsfall mit Auditgrund |
| Abschlussübersicht einsehen | Eigene Fälle | Eigene zugewiesene Fälle bis Bereinigung | Zuständige Fälle | Alle berechtigten Fälle |
| Sperrvermerk setzen oder aufheben | Nein | Nein | Ja, mit Begründung | Ja, mit Begründung |
| Anonymisiertes Abstract freigeben | Ja, fachliche Bestätigung | Nein | Ja, formale Prüfung | Ja, nur bei Sonderfall |
| Datenminimierung technisch ausführen | Indirekt durch Abschlussaktion | Nein | Indirekt nach Prüfbestätigung | Indirekt bei Sonderfall |
| Minimierte Nachweisliste lesen | Nur eigene Nachweise | Nein | Nein, sofern nicht gesondert freigegeben | Nur für Supportfall mit Audit |

Ein Sperrvermerk ist vorzusehen, wenn etwa ein Einspruch, eine offene Notenentscheidung, eine rechtliche Auseinandersetzung, ein dokumentierter Integritätsfall oder eine noch nicht erfolgte Übergabe an die Prüfungsverwaltung besteht. Die Sperre ist kein Dauerstatus: Sie enthält Begründung, gesetzt durch, Datum und eine regelmäßige Überprüfung.

## 6. Technische Umsetzung in Etappen

Die Implementierung wird erst nach der fachlichen Freigabe begonnen. Die Reihenfolge schützt vor irreversibler Bereinigung vor geklärter Aufbewahrungsregel.

| Etappe | Umsetzung | Abnahme |
|---|---|---|
| 1. Fachliche Freigabe | Aufbewahrungsfristen, Amtliche-Akte-Übergabe, Sperrgründe und Abstract-Regel verbindlich beschließen | Freigabe durch Prüfungsverwaltung, Datenschutz und Rechtsstelle |
| 2. Datenmodell | Status, Sperrvermerk, Minimalnachweisliste und anonyme Abstract-Tabelle migrieren | Migrationstest und Schema-Review |
| 3. Abschlussworkflow | Erstprüfer:innen-Dialog, Vorbedingungen, Zweitbestätigung und Audit einbauen | Rollen- und Negativtests |
| 4. Bereinigung | Transaktion, Objektbereinigung, Entkopplung des Audit-Logs und Fehlerwiederholung implementieren | Integrationstest mit Testdaten |
| 5. Rückhalte- und Backup-Regel | Lifecycle für Sicherungen, Wiederherstellungsprotokoll und Zugriff auf Sicherungen dokumentieren | Test der Wiederherstellung ohne Reaktivierung gelöschter Fälle |
| 6. Pilot | Begrenzter fachbereichsbezogener Test mit überprüften echten Abschlussfällen | Pilotprotokoll und Freigabe für Regelbetrieb |

### 6.1 Erforderliche Tests

Die technische Abnahme muss mindestens abdecken: Erstprüfer:innen können nur eigene verteidigte Fälle abschließen; ein fehlendes abgeschlossenes Kolloquium blockiert den Ablauf; ein Sperrvermerk blockiert die Minimierung; die Nachweisliste enthält ausschließlich die sechs definierten Felder; Zweitprüfer:innen und Verwaltung verlieren den Fallzugriff; das Abstract hat keine Fremdschlüssel zu Personen; die Bereinigung ist bei Fehlern atomar und wiederholbar.

### 6.2 Sicherungen und Wiederherstellung

Eine Produktionslöschung wirkt nicht rückwirkend auf bereits erstellte Sicherungen. Die Rückhaltezeit der Sicherungen, der Zugriffskreis und der Umgang mit einer Wiederherstellung müssen daher vorab festgelegt werden. Eine Wiederherstellung darf nicht dazu führen, dass bereits bereinigte Fälle ohne erneute Prüfung wieder im aktiven Portal erscheinen. Empfehlenswert ist ein Bereinigungsregister mit nicht personenbezogenem Ereigniskennzeichen, anhand dessen eine Wiederherstellungsroutine abgeschlossene Bereinigungen erneut anwenden kann.

## 7. Verbindliche Freigabepunkte vor Produktivbetrieb

Vor dem ersten produktiven Fall benötigen Prüfungsverwaltung, Datenschutzbeauftragte und Rechtsstelle eine schriftliche Entscheidung zu den folgenden Punkten:

1. Welche Unterlagen müssen außerhalb des Matching-Systems in der amtlichen Prüfungsakte verbleiben und für welche Frist?
2. Ab welchem rechtlich und fachlich verbindlichen Ereignis darf der Matching-Fall minimiert werden: Kolloquium durchgeführt, Ergebnis bekannt gegeben, Akte geschlossen oder nach einer Einspruchsfrist?
3. Wie lange darf die minimale Erstprüfer:innen-Nachweisliste bestehen und wer darf sie im Vertretungs- oder Streitfall einsehen?
4. Wer prüft Abstracts auf Personen-, Unternehmens- und Vertraulichkeitsbezug und ob eine zusätzliche Einwilligung erforderlich ist?
5. Wie werden Backups, Audit-Ereignisse und Exportdateien in das Löschkonzept einbezogen?

Bis zu dieser Freigabe wird empfohlen, den Status „Thesis defended“ zunächst nur als fachlichen Abschluss und **nicht** als irreversible Löschung einzuführen. Die eigentliche Bereinigung bleibt durch `minimizationState = pending` transparent zurückgehalten.

## 8. Empfohlene Produktentscheidung

Die vom Nutzer gewünschte Datensparsamkeit ist fachlich sinnvoll und lässt sich gut als klarer Abschlussprozess abbilden. Ich empfehle jedoch ausdrücklich **keine direkte Löschung allein durch den Erstprüfer**. Stattdessen soll der Erstprüfer den Status „Thesis defended“ setzen und die Bereinigung anstoßen. Das System führt die Bereinigung erst aus, wenn die Prüfungsverwaltung die amtliche Akte als abgeschlossen markiert hat und kein Sperrvermerk besteht. Damit bleibt die Bedienung einfach, die Nachweisliste schlank und die Verantwortung für amtliche Unterlagen klar getrennt.

## Quellen

[1] [HTW Berlin: Abschlussarbeit](https://www.htw-berlin.de/studium/studienorganisation/studienleistungen/abschlussarbeit)  
[2] [HTW Berlin, Amtliches Mitteilungsblatt Nr. 11/02: Satzung zur Übermittlung und Veröffentlichung von Daten über Abschlussarbeiten](https://www.htw-berlin.de/fileadmin/HTW/Zentral/Rechtsstelle/Amtliche_Mitteilungsblaetter/2002/11-02.pdf)  
[3] [Verordnung (EU) 2016/679 (Datenschutz-Grundverordnung), Artikel 5](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
