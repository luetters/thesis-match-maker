# Konzept für eine kontrollierte Pilotphase des Thesis-Matching-Systems

**Organisation:** HTW Berlin  
**Version:** 1.0  
**Zweck:** Vorbereitung eines nachvollziehbaren, risikoarmen Übergangs vom internen Testbetrieb in den fachbereichsübergreifenden Regelbetrieb

## 1. Zielbild und Grundsatz

Die Pilotphase soll nicht primär möglichst viele Anmeldungen erzeugen. Ihr Zweck ist, den vollständigen Ablauf unter realistischen Bedingungen mit einer begrenzten, gut betreuten Nutzergruppe zu prüfen. Dabei soll nachgewiesen werden, dass die Beteiligten ihre jeweiligen Aufgaben ohne informelle Nebenprozesse verstehen und durchführen können: Studierende reichen eine Anfrage ein, Erstprüfer:innen prüfen und bestätigen Betreuungen, Zweitprüfer:innen werden eingebunden und die zuständige Verwaltung bearbeitet Freigaben fachbereichsbezogen.

Die Pilotphase wird als **kontrollierter Echtbetrieb** durchgeführt. Es werden nur reale, freiwillig teilnehmende Personen und reale Prozessfälle verwendet. Testdaten oder künstliche Bewertungen werden nicht eingesetzt. Jede Rolle behält die Möglichkeit, einen Vorgang außerhalb des Systems zu klären, falls ein rechtlicher oder fristkritischer Sonderfall dies erfordert. Der jeweilige Ausnahmeweg wird jedoch kurz im Audit-Log oder in einer freigegebenen Prozessnotiz dokumentiert.

> **Erfolgsmaßstab:** Der Standardfall kann vollständig, verständlich und rollenbasiert im Portal bearbeitet werden; Sonderfälle sind erkennbar, dokumentierbar und erhalten innerhalb einer vorher vereinbarten Frist Unterstützung.

| Rahmenparameter | Empfehlung für den ersten Durchlauf |
|---|---|
| Fachbereich | Zunächst ein Fachbereich, vorzugsweise der aktuell am stärksten vorbereitete Bereich |
| Dauer | Vier Wochen aktiver Pilotbetrieb plus eine Woche Auswertung |
| Studierende | 8 bis 15 freiwillige Personen mit anstehender oder realer Thesis-Anfrage |
| Erstprüfer:innen | 5 bis 8 Personen aus mindestens zwei Studiengängen des Pilotfachbereichs |
| Zweitprüfer:innen | 3 bis 5 Personen, davon mindestens eine externe Zweitprüferin bzw. ein externer Zweitprüfer |
| Verwaltung | Mindestens zwei eingewiesene Verwaltungsmitarbeitende desselben Fachbereichs |
| Steuerung | Eine fachliche Pilotleitung und eine technische Ansprechperson mit Superadmin-Recht |

## 2. Rollen, Zuständigkeiten und Entscheidungswege

Die Pilotphase benötigt klare Zuständigkeiten. Die fachliche Pilotleitung entscheidet über Prozessfragen, priorisiert Rückmeldungen und gibt die Ergebnisse der Abschlussauswertung frei. Die technische Ansprechperson überwacht Verfügbarkeit, Sicherheitswarnungen, E-Mail-Versandprotokolle und reproduzierbare Fehler. Die Verwaltung bearbeitet nur die ihr fachbereichsbezogen zugewiesenen Fälle. Superadmins bleiben für fachbereichsübergreifende oder unvollständige Altfälle zuständig.

| Rolle | Kernaufgabe in der Pilotphase | Nicht Aufgabe dieser Rolle |
|---|---|---|
| Studierende | Registrierung, Profilprüfung, Anfrage an eine Erstbetreuung, Rückmeldung zur Verständlichkeit | Freischaltung oder Änderung fremder Daten |
| Erstprüfer:innen | Vollständiges Profil, Fachbereich, Kapazität, Prüfung und Annahme oder Ablehnung passender Anfragen | Freigabe von Nutzerkonten |
| Zweitprüfer:innen | Profil, Kapazität, Einsicht in zugewiesene Inhalte und Annahme einer Zweitprüfung | Themenvorschläge als Erstbetreuung oder Erinnerungen an Erstprüfer:innen |
| Fachbereichsverwaltung | Freigabe bzw. Ablehnung von Studierenden und internen Erstprüfer:innen des eigenen Fachbereichs | Fachfremde oder externe Rollen freigeben |
| Superadmin | Bearbeitung fachbereichsübergreifender Fälle, Altfälle, Systemkonfiguration und Auswertung | Operative Standardfreigaben des Fachbereichs |
| Pilotleitung | Steuerung, wöchentliche Auswertung, Entscheidung über priorisierte Nachbesserungen | Direkter Eingriff in personenbezogene Daten ohne Rollenrecht |

Für jeden kritischen Fall gilt eine einfache Eskalationskette: Zunächst prüft die zuständige Verwaltung die Freigabeliste und die sichtbaren Fachbereichsdaten. Ist der Fachbereich nicht vorhanden oder handelt es sich um eine externe bzw. fachbereichsübergreifende Rolle, geht der Fall an den Superadmin. Bei einem technischen Fehler wird der Fall mit Zeit, Rolle, Browser und anonymisierter Fehlerbeschreibung an die technische Ansprechperson übergeben.

## 3. Vorbereitungsphase

In der Woche vor dem Start werden alle Pilotpersonen persönlich eingeladen und erhalten einen kurzen Leitfaden. Die Einladung muss klarstellen, dass das Portal ein Hochschulsystem mit eigenem Passwort ist und nicht automatisch ein HTW-Berlin-Konto bereitstellt. Erstprüfer:innen wählen bei der Registrierung den eigenen Fachbereich; externe Zweitprüfer:innen kennzeichnen sich ausdrücklich als externe Rolle. Die Verwaltung erhält vorab eine kurze Einweisung zu Freigabeliste, Suche, Filterung, Profilvorschau und Fachbereichszuordnung von Altfällen.

Die technische Ansprechperson führt vor Start einen standardisierten Check durch. Dazu gehören die Passwortanmeldung, die Zwei-Faktor-Authentifizierung für berechtigte Rollen, die Freigabe durch Verwaltung und Superadmin, die Anzeige von Fachbereich und E-Mail in der Freigabeliste, die Dokumentberechtigung der beiden Gutachter:innen, der Export eines Kalendereintrags und das Audit-Log. Der Check wird als interne Abnahme dokumentiert.

| Vorbereitungspunkt | Verantwortlich | Nachweis |
|---|---|---|
| Pilotteilnehmende und Ersatzpersonen benennen | Pilotleitung | Freigabeliste der Pilotgruppe |
| Fachbereichszuordnung der Verwaltung prüfen | Superadmin | Rollen- und Fachbereichsübersicht |
| Profile der Erstprüfer:innen mit Titel, Fachbereich und Kontaktmöglichkeit vervollständigen | Erstprüfer:innen | Profilstatus im Portal |
| Externe Zweitprüfer:innen kennzeichnen | Pilotleitung / Superadmin | Rollenstatus und Kennzeichnung |
| Standard-E-Mail-Vorlagen fachlich prüfen | Verwaltung / Pilotleitung | Freigegebene Vorlagen |
| Supportkanal und Reaktionszeiten veröffentlichen | Pilotleitung | Kurzleitfaden für Teilnehmende |
| Test der Datensicherung und Wiederherstellungsanweisung | Technik | Protokollierter Test ohne Echtdatenverlust |

## 4. Testabläufe im aktiven Pilotbetrieb

Die Pilotphase verwendet einen begrenzten Satz echter Standardfälle. Jeder Ablauf wird mindestens einmal vollständig durchlaufen. Abweichungen werden nicht ad hoc „weggeklickt“, sondern als Rückmeldung erfasst, priorisiert und einer Entscheidung zugeordnet.

### 4.1 Ablauf für Studierende

Studierende registrieren sich mit ihrer vorgesehenen E-Mail-Adresse und einem eigenen Portalpasswort. Nach der fachbereichsbezogenen Freigabe prüfen sie ihr Profil, erfassen oder wählen einen Themenvorschlag und suchen eine Erstbetreuung über die verfügbaren Filter. Vor dem Absenden sehen sie Thema, Studiengang und gewählte Erstbetreuung in einer Zusammenfassung. Sie stimmen den optionalen Angaben zur Plagiats- und KI-Prüfung erst im Kontext des Thesis-Vorschlags zu.

Nach Eingang der Anfrage prüfen die Studierenden, ob der Status verständlich angezeigt wird und ob sie bei jeder Zustandsänderung eine korrekte E-Mail in ihrer bevorzugten Sprache erhalten. Sie dürfen in der Pilotphase eine Rückmeldung nicht nur zu Fehlern, sondern auch zu unklaren Begriffen, fehlenden Informationen und unnötigen Schritten geben.

### 4.2 Ablauf für Erstprüfer:innen

Erstprüfer:innen registrieren sich mit Titel und Fachbereich, ergänzen Kapazität und Profilinformationen und werden durch die Fachbereichsverwaltung freigeschaltet. Sie prüfen eine oder mehrere echte Anfragen, sehen Thema und zugelassene Unterlagen und nehmen eine Anfrage an oder lehnen sie mit nachvollziehbarer Begründung ab. Wenn eine Zweitprüfung erforderlich ist, wird die vorgesehene Person über den geregelten Ablauf eingebunden.

Wichtig ist die Beobachtung, ob Erstprüfer:innen erkennen, dass sie automatisch auch Zweitprüfungsrechte besitzen, jedoch die Rolle einer externen Zweitprüfung davon getrennt bleibt. Ebenfalls wird geprüft, ob Kapazitätsangaben, Kommissionspräferenzen und Statusübersicht verständlich sind.

### 4.3 Ablauf für Verwaltung

Die Verwaltung bearbeitet die Freigabeliste mit Suchfeld, Rollen- und Fachbereichsfiltern. Sie prüft Name, E-Mail, akademischen Titel, Fachbereich und Rolle. Interne Erstprüfer:innen des eigenen Fachbereichs dürfen freigegeben oder abgelehnt werden. Fachbereichslose Altfälle werden entweder nachträglich zugeordnet oder an Superadmins übergeben. Die Verwaltung dokumentiert insbesondere, ob die Profilvorschau genügend Informationen liefert, ohne unnötige personenbezogene Daten offenzulegen.

| Prüffall | Erwartetes Ergebnis | Erfassbare Beobachtung |
|---|---|---|
| Neue studentische Registrierung | Sichtbar und nur im zuständigen Fachbereich bearbeitbar | Zeit bis zur Freigabe, Fehlzuordnungen |
| Interne Erstprüfer:innenregistrierung | Titel und Fachbereich sichtbar; Verwaltung des Fachbereichs darf freigeben | Vollständigkeit der Angaben |
| Externe Zweitprüfer:innenregistrierung | Als externe Zweitprüfung sichtbar; Superadmin-Bearbeitung | Klare Rollenkennzeichnung |
| Altfälle ohne Fachbereich | Amber-Hinweis, direkte Zuordnung nur rollenbasiert | Zeit bis zur Korrektur |
| Über sieben Tage offene Anfrage | Visuelle Kennzeichnung und nachvollziehbare Dauer | Reaktions- und Eskalationszeit |
| Statusänderung | Richtige Anzeige, Audit-Eintrag und vorgesehene Benachrichtigung | Sprach- und Empfängerprüfung |

## 5. Support, Feedback und Fehlerbehandlung

Die Pilotphase benötigt einen niedrigschwelligen, aber strukturierten Supportweg. Dafür wird eine dedizierte E-Mail-Adresse oder ein klar benannter Funktionspostkorb verwendet. Rückmeldungen werden in drei Klassen eingeordnet: **Blocker** verhindert einen Prozessschritt; **Fachliche Unklarheit** betrifft Regel, Text oder Zuständigkeit; **Verbesserung** betrifft Bedienbarkeit oder Darstellung. Die Rückmeldung enthält keine vollständigen Dokumentinhalte. Sie nennt nur Rolle, Zeitpunkt, betroffenen Prozessschritt, anonymisierte Anfrage-ID und gegebenenfalls einen Screenshot.

| Klasse | Zielreaktionszeit | Behandlung |
|---|---|---|
| Blocker | Innerhalb eines Arbeitstags | Technische Analyse, dokumentierter Workaround, priorisierte Behebung |
| Fachliche Unklarheit | Innerhalb von zwei Arbeitstagen | Entscheidung durch Pilotleitung und gegebenenfalls FAQ-Ergänzung |
| Verbesserung | Wöchentliche Sichtung | Priorisierung nach Häufigkeit, Risiko und Prozessnutzen |

Wöchentlich findet ein kurzes Auswertungsgespräch der Pilotleitung, Verwaltung und technischen Ansprechperson statt. Die Sitzung soll höchstens 30 Minuten dauern und anhand eines festen Protokolls erfolgen: neue Blocker, offene Fachfragen, Bearbeitungszeiten, Rückmeldungen der Rollen und Entscheidung über die nächste Woche. Änderungen an Berechtigungen oder Datenmodellen werden nicht unmittelbar im laufenden Durchlauf ausgerollt, sofern sie laufende Fälle gefährden könnten. Sie werden zunächst getestet und mit einem Checkpoint nachvollziehbar veröffentlicht.

## 6. Datenschutz und Datenminimierung

Es werden nur die im Portal bereits vorgesehenen personenbezogenen Daten verarbeitet. Für die Pilotphase werden keine zusätzlichen Sonderkategorien personenbezogener Daten, keine verdeckten Nutzungsprofile und keine künstlichen Bewertungsdaten erhoben. Die statistische Auswertung verwendet aggregierte Werte, etwa Anzahl der Freigaben, Bearbeitungsdauer und Häufigkeit einer Rückmeldungskategorie. Namen, E-Mail-Adressen oder konkrete Thesis-Themen gehören nicht in Auswertungsfolien oder allgemeine Projektprotokolle.

Die Pilotgruppe wird vor Start darüber informiert, welche Systemprotokolle entstehen können, insbesondere Audit-Einträge zu Freigaben und sicherheitsrelevante Login-Protokolle. Die Information benennt Zweck, Zugriffskreis, Aufbewahrung nach geltender Hochschulregelung sowie Ansprechstellen für Datenschutz- und Prozessfragen. Screenshots für Fehlermeldungen werden vor Weitergabe geprüft und sensible Inhalte geschwärzt.

## 7. Erfolgskriterien und Auswertung

Ein erfolgreicher Pilot liegt nicht allein vor, wenn die Software technisch verfügbar war. Entscheidend ist, ob die Standardfälle zuverlässig, verständlich und fachlich korrekt bearbeitet werden konnten. Die folgenden Zielwerte sind als Orientierung zu verstehen. Die Pilotleitung kann sie vor Beginn an die reale Ausgangslage anpassen.

| Bereich | Zielkriterium | Mindestnachweis |
|---|---|---|
| Registrierung | Mindestens 90 % der eingeladenen Pilotpersonen schließen Registrierung und Freigabe ohne Individualsupport ab | Aggregierte Abschlussquote |
| Fachbereichszuordnung | Keine interne Erstprüfer:innenfreigabe ohne sichtbaren Fachbereich | Stichprobe aller Pilotfreigaben |
| Rollenrechte | Kein dokumentierter Zugriff außerhalb der vorgesehenen Rolle | Audit- und Fehlerauswertung |
| Prozessverständnis | Mindestens 80 % bewerten die Schritte ihrer Rolle als verständlich oder sehr verständlich | Anonyme Kurzbefragung |
| Bearbeitungszeit | Standardfreigaben im vereinbarten Servicefenster | Aggregierte Zeitwerte |
| Zuverlässigkeit | Kein ungelöster Blocker am Ende der aktiven Pilotphase | Fehlerliste und Abschlussentscheidung |
| Datenschutz | Keine unzulässige Weitergabe personenbezogener Daten in Support oder Auswertung | Datenschutzcheck der Pilotleitung |

Am Ende des Piloten erstellt die Pilotleitung eine kurze Abschlussnotiz. Sie trennt bestätigte Stärken, verbindlich zu lösende Probleme und optionale Verbesserungen. Die Note enthält eine klare Entscheidung: **Regelbetrieb freigeben**, **Pilot mit gezielten Korrekturen verlängern** oder **Rollout pausieren**. Die Entscheidung wird mit den zuständigen Fachbereichen und der Hochschulverwaltung abgestimmt.

## 8. Übergang in den Regelbetrieb

Der Übergang erfolgt stufenweise. Zuerst wird der Pilotfachbereich für den Regelbetrieb geöffnet, während die wöchentliche Auswertung für weitere vier Wochen fortgeführt wird. Danach werden weitere Fachbereiche einzeln ergänzt. Jeder neue Fachbereich erhält eine eigene Einweisung der Verwaltung, eine Prüfung der Studiengänge und Fristen sowie eine benannte fachliche Ansprechperson.

| Übergangsstufe | Voraussetzung | Entscheidung |
|---|---|---|
| Stufe A: Pilotstart | Vorbereitung vollständig, Testkonten und Support bereit | Pilotleitung gibt Start frei |
| Stufe B: Stabilisierung | Keine ungelösten Blocker, Kernabläufe nachweisbar | Pilotfachbereich bleibt geöffnet |
| Stufe C: Erweiterter Betrieb | Auswertung erfüllt die vereinbarten Kriterien | Nächsten Fachbereich planen |
| Stufe D: Regelbetrieb | Betriebsdokumentation, Support und Verantwortlichkeiten etabliert | Hochschule gibt breiten Rollout frei |

## 9. Konkrete nächste Schritte

Die Pilotleitung sollte zunächst den Pilotfachbereich, die Teilnehmenden und den Starttermin festlegen. Anschließend werden die E-Mail-Vorlagen und das geplante Benachrichtigungskonzept fachlich freigegeben. Vor dem ersten echten Antrag führt die technische Ansprechperson einen dokumentierten Durchlauf aller Standardfälle durch. Danach kann die Pilotgruppe eingeladen werden.

Die erste Auswertung sollte bereits nach fünf Arbeitstagen erfolgen. So lassen sich sprachliche Unklarheiten, fehlende Fachbereichsangaben oder unpassende Rollenrechte korrigieren, bevor sich diese Muster in mehreren realen Fällen wiederholen.
