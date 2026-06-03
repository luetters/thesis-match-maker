# Prozesse der Abschlussarbeit
## HTW Berlin – University of Applied Sciences

---

# Agenda

1. Überblick: Sechs Phasen von der Anmeldung bis zum Abschluss
2. Rollen und Verantwortlichkeiten im System
3. Phase 1 – Antragstellung durch Studierende
4. Phase 2 – Zuweisung der Erstprüfer:in
5. Phase 3 – Auswahl der Zweitprüfer:in
6. Phase 4 – Anmeldefähigkeit und Abgabe
7. Phase 5 – Kolloquiumsplanung und Prüfungsfähigkeit
8. Phase 6 – Kolloquium und Abschluss
9. Statusübergänge im Überblick
10. Automatische Benachrichtigungen im Prozess

---

# Sechs Phasen strukturieren den gesamten Prozess

Der administrative Ablauf einer Abschlussarbeit an der HTW Berlin gliedert sich in **sechs aufeinander aufbauende Phasen**. Jede Phase hat klar definierte Verantwortlichkeiten, Statusübergänge und automatische Benachrichtigungen.

| Phase | Bezeichnung | Hauptakteur:in |
|---|---|---|
| 1 | Antragstellung | Studierende:r |
| 2 | Zuweisung Erstprüfer:in | PAV / Studierende:r |
| 3 | Auswahl Zweitprüfer:in | Studierende:r |
| 4 | Anmeldefähigkeit & Abgabe | PAV / Studierende:r |
| 5 | Kolloquiumsplanung & Prüfungsfähigkeit | PAV / Prüfer:innen |
| 6 | Kolloquium & Abschluss | Prüfer:innen |

Der gesamte Prozess wird durch das **Thesis Match Maker**-System der HTW Berlin digital abgewickelt. Alle Beteiligten erhalten automatische E-Mail-Benachrichtigungen bei jedem Statuswechsel.

---

# Vier Rollen tragen gemeinsam Verantwortung

Das System kennt vier Hauptrollen, die im Prozess zusammenwirken. Jede Rolle hat spezifische Aufgaben und Zugriffsrechte.

**Studierende** reichen den Antrag ein, wählen Prüfer:innen aus und absolvieren das Kolloquium. Sie haben Einblick in alle ihre eigenen Anträge und deren Statusverläufe.

**Erstprüfer:innen** nehmen Betreuungsanfragen an oder lehnen sie ab, pflegen ihre Kapazitäten und koordinieren das Kolloquium. Sie können optional bevorzugte Zweitprüfer:innen hinterlegen.

**Zweitprüfer:innen** werden von Studierenden aus einer gefilterten Liste ausgewählt. Die Filterliste basiert auf den Präferenzen der Erstprüfer:in. Sie bestätigen ihre Teilnahme per E-Mail-Link.

**PAV (Prüfungsausschussvorsitz)** weist Prüfer:innen zu, prüft Anmelde- und Prüfungsfähigkeit und hat Einblick in alle Anträge des eigenen Studiengangs. Zusätzlich gibt es die Rollen **Dekanat**, **Admin** und **Superadmin** für übergeordnete Verwaltungsaufgaben.

---

# Phase 1: Antragstellung – Studierende initiieren den Prozess

Studierende starten den Prozess durch die Einreichung eines Antrags im System. Der Antrag enthält alle relevanten Informationen zur geplanten Abschlussarbeit.

**Erforderliche Angaben beim Antrag:**
- Titel der Abschlussarbeit
- Fachbereich und Studiengang (aus Profil übernommen)
- Abschlussart (Bachelor / Master)
- Sprache der Arbeit (Deutsch / Englisch)
- Gewünschte Erstprüfer:in (optional)
- Kurzbeschreibung / Exposé

Nach der Einreichung wechselt der Status auf **PENDING_FIRST_EXAMINER**. Das System benachrichtigt den PAV des zugehörigen Studiengangs automatisch. Studierende können den Antrag jederzeit zurückziehen, solange noch keine Prüfer:in zugesagt hat (Status: **WITHDRAWN**).

---

# Phase 2: Erstprüfer:in wird zugewiesen und antwortet

Der PAV weist dem Antrag eine Erstprüfer:in zu – entweder durch direkten Vorschlag mit anschließender Bestätigung durch die Prüfer:in oder durch direkte Zuweisung.

**Ablauf der Zuweisung:**

1. PAV wählt Erstprüfer:in aus der Liste verfügbarer Prüfer:innen (inkl. Kapazitätsanzeige)
2. System sendet automatische **Einladungs-E-Mail mit JWT-Link** an die Prüfer:in
3. Prüfer:in klickt auf „Annehmen" oder „Ablehnen" im E-Mail-Link
4. Bei **Annahme**: Status wechselt auf **FIRST_EXAMINER_ACCEPTED**
5. Bei **Ablehnung**: Studierende:r wird benachrichtigt und kann neue Anfrage stellen

Die Erstprüfer:in kann optional **bevorzugte Zweitprüfer:innen** in ihrem Profil hinterlegen. Diese Präferenzen beeinflussen die gefilterte Auswahlliste für Studierende in Phase 3.

---

# Phase 3: Zweitprüfer:in wird ausgewählt und bestätigt

Nach der Zusage der Erstprüfer:in wählen Studierende eine Zweitprüfer:in aus einer **gefilterten Liste**. Die Liste zeigt nur Prüfer:innen, die von der Erstprüfer:in bevorzugt werden – oder alle verfügbaren Zweitprüfer:innen, falls keine Präferenzen hinterlegt sind.

**Wichtige Einschränkungen:**
- Zweitprüfer:in darf nicht identisch mit der Erstprüfer:in sein
- Nur Prüfer:innen mit freien Kapazitäten werden angezeigt
- Prüfer:innen mit der Rolle `second_examiner` oder `examiner` (mit Zweitprüfer-Freigabe) sind wählbar

Nach der Auswahl sendet das System eine **Einladungs-E-Mail mit JWT-Link** an die Zweitprüfer:in. Bei Annahme wechselt der Status auf **MATCHED** – die Prüfungskommission ist vollständig. Beide Prüfer:innen und die Studierenden erhalten eine Bestätigungsbenachrichtigung.

---

# Phase 4: Anmeldefähigkeit wird geprüft, Arbeit wird abgegeben

Mit dem Status **MATCHED** beginnt die administrative Prüfung der Anmeldefähigkeit durch den PAV. Diese Prüfung stellt sicher, dass alle Voraussetzungen für die Anmeldung zur Abschlussarbeit erfüllt sind.

**Prüfung der Anmeldefähigkeit:**
- PAV prüft im Dashboard die Voraussetzungen (z. B. Leistungsnachweise)
- Bei **Bestätigung**: Studierende:r wird benachrichtigt und kann die Arbeit einreichen
- Bei **Ablehnung**: Prozess wird abgebrochen, Beratung wird empfohlen

Nach der Bestätigung der Anmeldefähigkeit reichen Studierende ihre fertige Arbeit ein. Das System protokolliert den Abgabezeitpunkt. Anschließend beginnt die Planung des Kolloquiums gemeinsam mit den Prüfer:innen.

---

# Phase 5: Kolloquium wird geplant, Prüfungsfähigkeit bestätigt

Das Kolloquium wird im System angelegt und koordiniert. Vor der Durchführung prüft der PAV die **Prüfungsfähigkeit** der/des Studierenden.

**Kolloquium anlegen:**
- Datum, Uhrzeit und Raum werden festgelegt
- Erst- und Zweitprüfer:in werden automatisch eingetragen
- Status wechselt auf **SCHEDULED**
- Alle Beteiligten erhalten eine Kalender-Einladung

**Prüfungsfähigkeit:**
- PAV bestätigt oder blockiert die Prüfungsfähigkeit
- Bei **Bestätigung**: Kolloquium kann planmäßig stattfinden
- Bei **Blockierung**: Kolloquium wird verschoben oder abgesagt (Status: **CANCELLED**)

Das System unterstützt mehrere Kolloquiumstermine pro Antrag, falls ein Termin abgesagt werden muss.

---

# Phase 6: Kolloquium findet statt – Abschlussarbeit abgeschlossen

Das Kolloquium ist der letzte Schritt im Prozess. Nach der Durchführung wird es im System als abgeschlossen markiert.

**Ablauf des Kolloquiums im System:**

1. Kolloquium hat Status **SCHEDULED** – alle Beteiligten sind informiert
2. Prüfer:innen führen das Kolloquium durch
3. Prüfer:in markiert das Kolloquium als **COMPLETED** im System
4. Abschlussarbeit gilt als vollständig abgewickelt

**Mögliche Abweichungen:**
- Kolloquium wird abgesagt → Status **CANCELLED** → neuer Termin wird angelegt
- Prüfungsfähigkeit wird nachträglich blockiert → Kolloquium wird verschoben

Nach dem Abschluss stehen alle Daten für Berichte und Statistiken im Dekanat- und Admin-Dashboard zur Verfügung, inklusive Bearbeitungszeiten und Abschlussquoten.

---

# Alle Statusübergänge auf einen Blick

Der Antragsstatus durchläuft im Laufe des Prozesses mehrere definierte Zustände. Jeder Übergang wird im **Audit-Log** protokolliert.

| Status | Bedeutung | Nächster Schritt |
|---|---|---|
| `PENDING` | Antrag eingegangen | Aktivierung durch PAV |
| `PENDING_FIRST_EXAMINER` | Warten auf Erstprüfer:in | PAV weist zu |
| `FIRST_EXAMINER_ACCEPTED` | Erstprüfer:in hat zugesagt | Zweitprüfer:in wählen |
| `FIRST_EXAMINER_REJECTED` | Erstprüfer:in hat abgelehnt | Neue Anfrage stellen |
| `PENDING_SECOND_EXAMINER` | Warten auf Zweitprüfer:in | Antwort abwarten |
| `MATCHED` | Beide Prüfer:innen zugesagt | Anmeldefähigkeit prüfen |
| `COMPLETED` | Abschlussarbeit abgeschlossen | — |
| `WITHDRAWN` | Zurückgezogen | — |
| `REJECTED` / `CANCELLED` | Abgebrochen | — |

Alle Statuswechsel lösen automatische **In-App-Benachrichtigungen** und **E-Mails** an alle betroffenen Beteiligten aus.

---

# Automatische Benachrichtigungen halten alle Beteiligten informiert

Das System sendet bei jedem relevanten Ereignis automatische Benachrichtigungen – sowohl als **In-App-Notification** als auch als **E-Mail**.

**Benachrichtigungsauslöser:**

- Antrag eingereicht → Bestätigung an Studierende:n
- Prüfer:in zugewiesen → Einladungs-E-Mail mit JWT-Aktionslink
- Prüfer:in hat zugesagt / abgelehnt → Benachrichtigung an Studierende:n
- Status MATCHED erreicht → Benachrichtigung an alle drei Beteiligten
- Anmeldefähigkeit bestätigt → Benachrichtigung an Studierende:n
- Prüfungsfähigkeit bestätigt → Benachrichtigung an Studierende:n und Prüfer:innen
- Kolloquiumstermin angelegt → Kalender-Einladung an alle Beteiligten

Die E-Mails an Prüfer:innen enthalten **JWT-gesicherte Aktionslinks** zum direkten Annehmen oder Ablehnen ohne Login-Pflicht. Dies reduziert den administrativen Aufwand erheblich.

---

# Zusammenfassung: Digitaler Prozess von Anfang bis Ende

Das **Thesis Match Maker**-System der HTW Berlin digitalisiert den gesamten administrativen Prozess der Abschlussarbeit – von der ersten Anfrage bis zum abgeschlossenen Kolloquium.

**Kernvorteile des Systems:**
- Vollständig digitaler Prozess ohne Papierdokumente
- Automatische Benachrichtigungen bei jedem Statuswechsel
- Transparente Statusverfolgung für alle Beteiligten
- JWT-gesicherte E-Mail-Aktionslinks für Prüfer:innen
- Lückenlose Audit-Log-Protokollierung aller Aktionen
- Kapazitätsverwaltung für Prüfer:innen
- Statistiken und Berichte für Dekanat und Administration

**HTW Berlin – University of Applied Sciences**
*Thesis Match Maker | Stand: Juni 2026*
