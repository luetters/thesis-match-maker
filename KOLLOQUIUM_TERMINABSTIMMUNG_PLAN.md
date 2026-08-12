# Plan: Gemeinsame Terminabstimmung für Kolloquien

**Projekt:** Thesis-Management HTW Berlin  
**Autor:** Manus AI  
**Stand:** 6. August 2026  
**Status:** Konzept zur Freigabe – noch nicht implementiert

## 1. Zielbild

Für jedes Kolloquium soll eine nachvollziehbare, verbindliche Terminabstimmung zwischen **Studierenden**, **Erstprüfer:in** und **Zweitprüfer:in** möglich sein. Statt einen Termin ausschließlich durch die Verwaltung einzutragen, startet die Erstprüferin oder der Erstprüfer eine Abstimmung mit mehreren konkreten Zeitfenstern. Alle drei Beteiligten geben ihre Verfügbarkeit ab. Ein Termin kann nur verbindlich festgelegt werden, wenn alle drei Personen dem gleichen Zeitfenster zustimmen.

Die Terminabstimmung ergänzt die bestehende Kolloquiumsverwaltung. Sie ersetzt weder die formale Prüfung der Zulassung noch die bestehenden Verwaltungsrechte zur Korrektur, Absage oder endgültigen Dokumentation eines Termins.

> **Leitprinzip:** Ein Kolloquiumstermin wird erst verbindlich, wenn Studierende:r, Erstprüfer:in und Zweitprüfer:in dieselbe Terminoption bestätigt haben. Alle Änderungen bleiben im Audit-Log nachvollziehbar.

## 2. Ausgangslage im bestehenden System

Die Anwendung besitzt bereits zwei voneinander getrennte Terminwege. Die Tabelle `colloquiums` verwaltet administrativ angelegte Termine mit `scheduledAt`, Ort, Raum und Status. Zusätzlich speichert die Abschlussarbeitsakte ein offizielles Verteidigungsdatum in `thesisRequests.defenseDate`, das derzeit durch die Prüfungsverwaltung gesetzt wird. Die vorhandenen Ansichten für Studierende und Prüfer:innen zeigen Kolloquien bisher nur lesend an; eine gemeinsame Verfügbarkeitsabfrage existiert noch nicht.

Der neue Ablauf wird deshalb als eigene, vorgelagerte **Abstimmungseinheit** modelliert. Erst nach erfolgreicher Einigung wird daraus ein bestehendes Kolloquium erzeugt beziehungsweise dessen offizielles Verteidigungsdatum gepflegt.

| Bestehender Baustein | Nutzung im neuen Ablauf |
|---|---|
| `thesisRequests` | Liefert Studierende:n, Erstprüfer:in, Zweitprüfer:in, Thesis-Titel und Zulassungsstatus. |
| `colloquiums` | Wird nach der verbindlichen Einigung als finaler Kalendereintrag angelegt. |
| `thesisRequests.defenseDate` | Wird nach finaler Terminbestätigung mit dem verbindlichen Termin synchronisiert. |
| Audit-Log | Protokolliert Erstellung, Terminoptionen, Antworten, Auswahl, Bestätigung, Absage und Überschreibungen. |
| Bestehender ICS-Export | Wird nach Finalisierung weiterverwendet; die drei Beteiligten können den bestätigten Termin exportieren. |

## 3. Vorgeschlagener Abstimmungsworkflow

Die Erstprüferin oder der Erstprüfer übernimmt die Rolle der koordinierenden Person. Sie oder er eröffnet eine Abstimmung, legt Dauer, Abstimmungsfrist sowie mindestens drei und höchstens zehn Terminoptionen fest. Vor dem Öffnen prüft das System, ob die Arbeit für das Kolloquium zugelassen ist, beide Prüfer:innen eingetragen sind und kein bereits bestätigter Termin existiert.

Studierende:r, Erstprüfer:in und Zweitprüfer:in geben je Terminoption **„verfügbar“**, **„unter Vorbehalt“** oder **„nicht verfügbar“** an. Solange eine Option nicht von allen drei Personen als verfügbar markiert ist, kann kein Termin bestätigt werden. Die Ansicht zeigt den Fortschritt transparent an, ohne private Begründungen oder Kalenderdetails offenzulegen.

Sobald eine vollständig passende Option vorliegt, markiert die koordinierende Erstprüferin oder der koordinierende Erstprüfer diese als Vorschlag. Danach erhalten alle drei Beteiligten eine kurze Abschlussbestätigung. Mit der dritten Bestätigung wird der Termin verbindlich, ein Kolloquiumseintrag erzeugt, das Verteidigungsdatum synchronisiert und eine Kalenderdatei bereitgestellt.

| Status | Bedeutung | Zulässige nächste Schritte |
|---|---|---|
| `DRAFT` | Terminoptionen werden vorbereitet, noch keine Person eingeladen. | Optionen bearbeiten, öffnen, verwerfen. |
| `OPEN` | Abstimmung läuft; Verfügbarkeiten können abgegeben oder geändert werden. | Antworten, Optionen ergänzen, Erinnerung auslösen, abbrechen. |
| `MATCH_FOUND` | Mindestens eine Option ist für alle drei Personen verfügbar. | Koordination wählt eine Option für die Schlussbestätigung. |
| `AWAITING_CONFIRMATION` | Eine passende Option wurde ausgewählt und wartet auf drei Abschlussbestätigungen. | Bestätigen, ablehnen, zurück in die Abstimmung. |
| `CONFIRMED` | Der Termin ist verbindlich. Kolloquium und offizielles Verteidigungsdatum sind gesetzt. | ICS exportieren; Verwaltung kann bei Bedarf umplanen oder absagen. |
| `EXPIRED` | Die Frist ist ohne Einigung abgelaufen. | Frist verlängern, neue Optionen erstellen oder abbrechen. |
| `CANCELLED` | Die Abstimmung wurde beendet. | Neue Abstimmung anlegen. |

### Beispielablauf

Die Erstprüferin eröffnet eine Abstimmung für eine zugelassene Thesis und bietet vier Zeitfenster im gewünschten Zeitraum an. Alle drei Beteiligten markieren ihre Verfügbarkeit. Drei Personen sind bei zwei Optionen verfügbar; die Erstprüferin wählt eine davon aus, ergänzt bei Bedarf Raum und Ort und fordert die Schlussbestätigung an. Nach Bestätigung aller drei Personen zeigt die Anwendung den Termin als verbindlich an und verschickt die Terminbestätigung einschließlich ICS-Export.

## 4. Rollen und Berechtigungen

| Rolle | Berechtigungen innerhalb der Terminabstimmung |
|---|---|
| **Studierende:r** | Sieht eigene Abstimmungen, gibt Verfügbarkeit ab, kann eine Schlussbestätigung erteilen oder ablehnen und erhält Termin- sowie Änderungsinformationen. |
| **Erstprüfer:in** | Eröffnet die Abstimmung, definiert Dauer, Frist und Optionen, nimmt selbst teil, wählt eine vollständig passende Option aus, fordert die Schlussbestätigung an und kann vor der Finalisierung eine Abstimmung abbrechen oder neu öffnen. |
| **Zweitprüfer:in** | Sieht nur Abstimmungen zu eigenen Abschlussarbeiten, gibt Verfügbarkeit ab, bestätigt oder lehnt den finalen Vorschlag ab und erhält Termin- sowie Änderungsinformationen. |
| **Prüfungsverwaltung / Admin** | Sieht alle Abstimmungen, kann im Ausnahmefall Fristen, Optionen, Ort und Raum korrigieren, eine Abstimmung abbrechen oder einen Termin überschreiben. Jede Intervention wird besonders im Audit-Log markiert. |

Die Berechtigung wird serverseitig ausschließlich über die in der Abschlussarbeit hinterlegten IDs (`studentId`, `examinerId`, `secondExaminerId`) geprüft. Eine Person darf weder Antworten noch Bestätigungen für eine andere Person abgeben.

## 5. Datenmodell

Für eine robuste Umsetzung werden drei neue Tabellen vorgeschlagen. Die Beteiligten werden beim Eröffnen der Abstimmung als Momentaufnahme gespeichert. Dadurch bleibt die Historie korrekt, selbst wenn sich später Profil- oder Rolleninformationen ändern.

| Tabelle | Zentrale Felder | Zweck |
|---|---|---|
| `colloquium_scheduling_polls` | `id`, `thesisRequestId`, `createdById`, `status`, `durationMinutes`, `responseDeadline`, `selectedSlotId`, `location`, `room`, `createdAt`, `updatedAt`, `finalizedAt` | Kopf der Terminabstimmung und deren Lebenszyklus. |
| `colloquium_scheduling_participants` | `pollId`, `userId`, `participantRole`, `invitedAt`, `lastRespondedAt`, `confirmedAt`, `declinedAt` | Eingeladene Personen und deren Rolle als Studierende:r, Erst- oder Zweitprüfer:in. |
| `colloquium_scheduling_slots` | `id`, `pollId`, `startsAt`, `endsAt`, `createdById`, `createdAt`, `isSelected` | Konkrete Terminoptionen. Start und Ende werden UTC-basiert gespeichert und in Europe/Berlin angezeigt. |
| `colloquium_scheduling_responses` | `slotId`, `participantId`, `availability`, `updatedAt` | Antwort je Person und Terminoption (`YES`, `MAYBE`, `NO`). Die Kombination aus Person und Slot ist eindeutig. |

Die vorhandenen Tabellen `colloquiums` und `thesisRequests` werden erst beim Statuswechsel nach `CONFIRMED` aktualisiert. Die Finalisierung geschieht in einer Datenbanktransaktion, damit niemals ein offizielles Verteidigungsdatum ohne passenden Kolloquiumseintrag entsteht.

## 6. Terminlogik und Konfliktregeln

Eine Terminoption ist **vollständig passend**, wenn alle drei Beteiligten `YES` gewählt haben. Optionen mit `MAYBE` werden sichtbar hervorgehoben, dürfen aber nicht ohne erneute, ausdrückliche Schlussbestätigung finalisiert werden. Damit bleibt klar, dass ein „unter Vorbehalt“ noch keine verbindliche Zusage ist.

Wird eine Option nach bereits abgegebenen Antworten verändert, löscht das System die Antworten ausschließlich für diese Option. Werden alle Optionen wesentlich verändert oder neu angelegt, wird die Auswahl für eine eventuell gestartete Schlussbestätigung zurückgesetzt. Nach einer Ablehnung der Schlussbestätigung kehrt die Abstimmung in den Status `OPEN` zurück; der Ablehnungsgrund ist optional und nur für die beiden Prüfer:innen sowie die Verwaltung sichtbar.

| Regel | Vorgeschlagenes Verhalten |
|---|---|
| Startvoraussetzung | Beide Prüfer:innen sind zugeordnet und `defenseEligibility` ist `approved`. |
| Anzahl Optionen | Mindestens 3, höchstens 10 Zeitfenster pro Abstimmung. |
| Termindauer | Voreinstellung 60 Minuten; Erstprüfer:in kann 30–180 Minuten wählen. |
| Abstimmungsfrist | Standard 10 Kalendertage; Erstprüfer:in kann 2–21 Tage wählen. |
| Neue oder geänderte Optionen | Betroffene Antworten werden zurückgesetzt; alle Beteiligten sehen den Änderungsgrund. |
| Keine Einigung | Nach Fristablauf `EXPIRED`; Erstprüfer:in kann eine neue Runde mit weiteren Optionen öffnen. |
| Parallelität | Pro Thesis ist nur eine offene oder auf Bestätigung wartende Abstimmung erlaubt. |
| Finalisierung | Erst nach drei Schlussbestätigungen, atomar mit `colloquiums` und `defenseDate`. |

## 7. Ansichten und Bedienung

Die neue Funktion wird als eigenständiger Bereich **„Terminabstimmung“** in die bestehenden Kolloquiumsansichten eingebunden. Sie nutzt die bestehende gestufte Kommunikation für Zweitprüfer:innen-Anfragen als UX-Vorbild: klarer Status, eindeutige nächste Aktion und transparente Beteiligte.

| Oberfläche | Inhalt |
|---|---|
| **Studierenden-Dashboard** | Karte „Kolloquiumstermin abstimmen“ mit Frist, Namen beider Prüfer:innen, Terminoptionen und eigener Verfügbarkeit. Nach Finalisierung: verbindlicher Termin, Ort, Raum und ICS-Download. |
| **Prüfer:innen-Dashboard** | Liste eigener offener Abstimmungen. Erstprüfer:innen erhalten zusätzlich die Schaltflächen „Abstimmung eröffnen“, „Optionen bearbeiten“, „Erinnerung senden“ und „Termin zur Bestätigung vorschlagen“. Zweitprüfer:innen sehen nur eigene Beteiligungen. |
| **Kolloquiumsverwaltung** | Neuer Tab „Terminabstimmungen“ für Administration und Prüfungsverwaltung mit Status, Frist, Antwortfortschritt und Eingriffsmöglichkeiten. Der bisherige Dialog „Neues Kolloquium“ bleibt für Ausnahmefälle als manuelle Anlage erhalten. |
| **Finale Kolloquiumsansicht** | Ergänzung um Herkunft „Durch Terminabstimmung bestätigt“, Beteiligte, Audit-Zeitlinie und ICS-Export. |

Die Verfügbarkeitsmatrix zeigt die drei Personen als Zeilen und die Terminoptionen als Spalten. Für Mobilgeräte wird dieselbe Information in aufeinanderfolgenden Karten dargestellt. Verfügbare Volltreffer werden grün markiert; Optionen mit Vorbehalt sind amber; nicht passende Optionen bleiben neutral oder rot. Persönliche Gründe werden nicht in der Matrix gezeigt.

## 8. Benachrichtigungen und Erinnerungen

Bei jeder relevanten Aktion wird in der Anwendung eine Benachrichtigung erstellt. E-Mail-Versand berücksichtigt die vorhandenen individuellen Benachrichtigungseinstellungen. Die nachfolgende Entscheidung betrifft ausschließlich automatische Erinnerungen vor Ablauf der Abstimmungsfrist.

| Ansatz | Funktionsweise | Aufwand | Laufende Kosten / Betrieb | Komplexität |
|---|---|---|---|---|
| **A. Direkte Hinweise und manuelle Erinnerung** | Einladungen, Änderungen und Bestätigungen werden unmittelbar nach einer Nutzeraktion per In-App-Hinweis und – falls aktiviert – E-Mail gesendet. Erstprüfer:innen können eine Erinnerung manuell auslösen. Der Fristablauf wird beim Öffnen der Abstimmung berechnet. | Niedrig | Kein Hintergrundprozess erforderlich. | Niedrig |
| **B. Automatische Fristerinnerungen** | Zusätzlich erinnert das System fehlende Personen beispielsweise 3 Tage und 1 Tag vor Fristablauf automatisch. Nicht beantwortete Abstimmungen werden bei Fristende aktiv als abgelaufen markiert. | Mittel | Erfordert einen täglichen, dauerhaft gepflegten Hintergrundlauf. | Mittel |

Für den ersten Ausbau sind beide Varianten technisch sinnvoll. **Variante A** liefert bereits einen vollständigen Abstimmungsprozess ohne Hintergrundbetrieb; **Variante B** erhöht die Verbindlichkeit bei längeren oder häufigen Abstimmungen. Die Entscheidung sollte vor der Implementierung getroffen werden, weil sie die technische Infrastruktur und die Benachrichtigungseinstellungen beeinflusst.

Unabhängig von der gewählten Variante sind folgende Ereignisse vorgesehen: Eröffnung der Abstimmung, Erinnerung, Änderung von Optionen, vollständige Terminübereinstimmung, Aufforderung zur Schlussbestätigung, verbindliche Bestätigung, Ablehnung, Fristablauf, Absage und Verwaltungsüberschreibung. Jede Nachricht enthält einen direkten Link zur betreffenden Abstimmung. Die verbindliche Terminbestätigung enthält zusätzlich einen ICS-Export.

## 9. Schnittstellen und Serverlogik

Der bestehende `colloquium`-Router wird um einen Unterbereich `scheduling` erweitert. Alle Prozeduren verwenden die vorhandene Rollen- und Thesis-Zuordnungsprüfung. Die jeweiligen Mutationen schreiben zusätzlich nachvollziehbare Ereignisse in das Audit-Log.

| tRPC-Prozedur | Berechtigung | Aufgabe |
|---|---|---|
| `colloquium.scheduling.getByThesis` | Beteiligte oder Verwaltung | Aktuelle Abstimmung einschließlich eigener Antwort laden. |
| `colloquium.scheduling.create` | Erstprüfer:in, optional Verwaltung | Entwurf mit Optionen, Dauer, Frist und vorläufigen Ortsangaben erstellen. |
| `colloquium.scheduling.open` | Erstellende Erstprüfer:in oder Verwaltung | Validieren, Einladungen erzeugen und Abstimmung öffnen. |
| `colloquium.scheduling.respond` | Eingeladene Person | Verfügbarkeit pro Option setzen oder ändern. |
| `colloquium.scheduling.updateSlots` | Erstprüfer:in oder Verwaltung | Optionen ergänzen, bearbeiten oder entfernen; betroffene Antworten zurücksetzen. |
| `colloquium.scheduling.selectSlot` | Erstprüfer:in oder Verwaltung | Vollständig passende Option zur Schlussbestätigung auswählen. |
| `colloquium.scheduling.confirmSelection` | Eingeladene Person | Finalen Vorschlag bestätigen oder ablehnen. |
| `colloquium.scheduling.finalize` | Systemintern innerhalb der Bestätigungslogik | Nach dritter Zustimmung Kolloquium, `defenseDate`, Audit-Log und Benachrichtigungen atomar erzeugen. |
| `colloquium.scheduling.cancelOrReopen` | Erstprüfer:in oder Verwaltung | Abstimmung abbrechen oder nach einer Ablehnung erneut öffnen. |
| `colloquium.scheduling.remind` | Erstprüfer:in oder Verwaltung | Manuelle Erinnerung nur an noch nicht antwortende Personen senden. |

## 10. Qualitätssicherung und Abnahmekriterien

Die Umsetzung wird nicht nur durch Oberflächentests, sondern mit serverseitigen Vitest-Integrationstests abgesichert. Besonders wichtig sind Berechtigungen, Statusübergänge und die atomare Erstellung des finalen Kolloquiums.

| Testbereich | Erforderliche Tests |
|---|---|
| Berechtigungen | Nur die drei beteiligten Personen können ihre Abstimmung sehen und für sich selbst antworten; Zweitprüfer:innen sehen keine fremden Fälle. |
| Terminlogik | Volltreffer nur bei drei `YES`; Vorbehalt führt nicht automatisch zur Finalisierung; geänderte Slots löschen nur betroffene Antworten. |
| Statusübergänge | Entwurf → offen → Volltreffer → Bestätigung → final sowie Ablehnung, Fristablauf, Wiederöffnung und Absage. |
| Datenkonsistenz | Drei Bestätigungen erzeugen genau ein Kolloquium und synchronisieren genau ein offizielles Verteidigungsdatum. Fehler führen zu keinem Teilzustand. |
| Benachrichtigungen | Richtige Empfänger:innen, Links, E-Mail-Präferenzen und ICS-Inhalt für die verbindliche Bestätigung. |
| Audit-Log | Alle wesentlichen Aktionen enthalten Thesis-ID, handelnde Person, vorherigen/neuen Status und Kontextdaten. |
| Oberfläche | Lade-, Leer-, Fehler- und Mobilzustände für jede Rolle; klare Kennzeichnung der nächsten benötigten Aktion. |

Die fachliche Abnahme ist erfüllt, wenn eine Test-Thesis mit drei Beteiligten durchgängig von der Erstellung von Terminoptionen bis zu einem ICS-exportierbaren, offiziell gespeicherten Kolloquium geführt werden kann und jeder kritische Schritt im Audit-Log erscheint.

## 11. Umsetzungsreihenfolge

| Schritt | Lieferumfang | Ergebnis |
|---|---|---|
| 1 | Schema-Migration, Typen und DB-Hilfsfunktionen | Persistente Abstimmungen, Optionen, Teilnehmer:innen und Antworten. |
| 2 | tRPC-Prozeduren, Rechte- und Statusprüfung | Sicherer, auditierter Serverworkflow. |
| 3 | Erstprüfer:innen-Ansicht | Optionen erstellen, öffnen, Änderungen verwalten, Volltreffer auswählen. |
| 4 | Studierenden- und Zweitprüfer:innen-Ansichten | Verfügbarkeiten und Schlussbestätigung mobilfähig abgeben. |
| 5 | Finalisierung, ICS, Verwaltungseinbindung und E-Mails | Verbindlicher Termin mit Synchronisierung in die bestehende Kolloquiumsverwaltung. |
| 6 | Tests, Fehlerbehandlung und Abnahme | Nachweisbar stabiler Rollout. |

## 12. Entscheidungen zur Freigabe

Vor Beginn der Implementierung sollten vier fachliche Entscheidungen bestätigt werden. Der Plan empfiehlt, die Erstprüferin oder den Erstprüfer als koordinierende Person festzulegen, eine Termindauer von 60 Minuten vorzubelegen, die Abstimmung erst nach formaler Zulassung zu öffnen und die endgültige Festlegung an drei Schlussbestätigungen zu binden.

| Entscheidung | Empfohlene Voreinstellung | Alternativen |
|---|---|---|
| Wer eröffnet die Abstimmung? | Erstprüfer:in | Prüfungsverwaltung zusätzlich zulassen. |
| Wann darf die Abstimmung starten? | Nach Zulassung und vollständiger Prüfer:innen-Zuordnung | Bereits nach Zuordnung beider Prüfer:innen. |
| Wann ist der Termin verbindlich? | Drei Schlussbestätigungen | Direkte Finalisierung bei drei `YES` ohne zusätzlichen Bestätigungsschritt. |
| Wie sollen Erinnerungen laufen? | Variante A: manuelle Erinnerung, keine Hintergrundautomatisierung | Variante B: automatische E-Mail-Erinnerungen vor Fristablauf. |

Nach Ihrer Freigabe dieser vier Entscheidungen kann die Umsetzung in der angegebenen Reihenfolge beginnen.
