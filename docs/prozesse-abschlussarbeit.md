# Prozesse der Abschlussarbeit – HTW Berlin

Dieses Dokument beschreibt alle administrativen Prozessschritte zur Abwicklung einer Abschlussarbeit an der HTW Berlin, sowohl aus Sicht der **Studierenden** als auch aus Sicht der **Prüfer:innen**. Die Diagramme sind im [Mermaid](https://mermaid.js.org/)-Format erstellt.

---

## 1. Gesamtprozess im Überblick

```mermaid
flowchart TD
    A([Start: Studierende:r möchte Abschlussarbeit anmelden]) --> B[Antrag einreichen]
    B --> C{Erstprüfer:in zugewiesen?}
    C -- Nein --> D[PAV weist Erstprüfer:in zu]
    C -- Ja --> E[Erstprüfer:in erhält Anfrage per E-Mail]
    D --> E
    E --> F{Erstprüfer:in antwortet}
    F -- Ablehnung --> G[Studierende:r wählt neue Erstprüfer:in]
    G --> E
    F -- Annahme --> H[Studierende:r wählt Zweitprüfer:in]
    H --> I[Zweitprüfer:in erhält Anfrage per E-Mail]
    I --> J{Zweitprüfer:in antwortet}
    J -- Ablehnung --> K[Studierende:r wählt neue Zweitprüfer:in]
    K --> I
    J -- Annahme --> L[Status: MATCHED – Prüfungskommission vollständig]
    L --> M[Anmeldefähigkeit durch PAV prüfen]
    M --> N{Anmeldefähigkeit}
    N -- Abgelehnt --> O([Prozess abgebrochen])
    N -- Bestätigt --> P[Abgabe der Arbeit]
    P --> Q[Kolloquium planen]
    Q --> R[Prüfungsfähigkeit durch PAV prüfen]
    R --> S{Prüfungsfähigkeit}
    S -- Blockiert --> O
    S -- Bestätigt --> T[Kolloquium durchführen]
    T --> U[Kolloquium als abgeschlossen markieren]
    U --> V([Ende: Abschlussarbeit abgeschlossen])
```

---

## 2. Prozess aus Sicht der Studierenden

```mermaid
flowchart TD
    S1([Registrierung & Profil vervollständigen]) --> S2[Antrag einreichen\nThema, Fachbereich, Abschlussart, Sprache]
    S2 --> S3[Status: PENDING_FIRST_EXAMINER\nWarten auf Erstprüfer:in]
    S3 --> S4{Erstprüfer:in zugewiesen?}
    S4 -- Durch PAV direkt zugewiesen --> S5[Erstprüfer:in wird benachrichtigt]
    S4 -- Noch nicht zugewiesen --> S3
    S5 --> S6{Antwort der Erstprüfer:in}
    S6 -- Abgelehnt\nStatus: FIRST_EXAMINER_REJECTED --> S7[Neue Erstprüfer:in anfragen\noder Antrag zurückziehen]
    S7 --> S3
    S6 -- Angenommen\nStatus: FIRST_EXAMINER_ACCEPTED --> S8[Zweitprüfer:in auswählen\naus gefilterter Liste]
    S8 --> S9[Status: PENDING_SECOND_EXAMINER\nWarten auf Zweitprüfer:in]
    S9 --> S10{Antwort der Zweitprüfer:in}
    S10 -- Abgelehnt --> S11[Neue Zweitprüfer:in anfragen]
    S11 --> S9
    S10 -- Angenommen --> S12[Status: MATCHED\nPrüfungskommission vollständig]
    S12 --> S13[Benachrichtigung über Anmeldefähigkeit abwarten]
    S13 --> S14{Anmeldefähigkeit durch PAV}
    S14 -- Abgelehnt --> S15([Prozess abgebrochen\nBeratung empfohlen])
    S14 -- Bestätigt --> S16[Arbeit einreichen / Abgabe]
    S16 --> S17[Kolloquiumstermin abstimmen]
    S17 --> S18[Benachrichtigung über Prüfungsfähigkeit abwarten]
    S18 --> S19{Prüfungsfähigkeit durch PAV}
    S19 -- Blockiert --> S15
    S19 -- Bestätigt --> S20[Kolloquium absolvieren]
    S20 --> S21([Abschlussarbeit erfolgreich abgeschlossen])
```

### Statusübersicht für Studierende

| Status | Bedeutung |
|---|---|
| `PENDING` | Antrag eingegangen, noch nicht bearbeitet |
| `PENDING_FIRST_EXAMINER` | Warten auf Zuweisung einer Erstprüfer:in |
| `FIRST_EXAMINER_ACCEPTED` | Erstprüfer:in hat zugesagt |
| `FIRST_EXAMINER_REJECTED` | Erstprüfer:in hat abgelehnt |
| `PENDING_SECOND_EXAMINER` | Zweitprüfer:in wurde gewählt, wartet auf Antwort |
| `MATCHED` | Beide Prüfer:innen haben zugesagt |
| `WITHDRAWN` | Antrag wurde von Studierenden zurückgezogen |
| `COMPLETED` | Abschlussarbeit vollständig abgeschlossen |
| `REJECTED` | Antrag abgelehnt (durch Verwaltung) |
| `CANCELLED` | Antrag storniert |

---

## 3. Prozess aus Sicht der Prüfer:innen

### 3a. Erstprüfer:in

```mermaid
flowchart TD
    E1([Profil anlegen & Kapazitäten eintragen]) --> E2[Einladungs-E-Mail mit JWT-Link erhalten\nWenn Antrag zugewiesen wird]
    E2 --> E3{Anfrage annehmen oder ablehnen}
    E3 -- Ablehnen --> E4[Ablehnungsgrund angeben\nStudierende:r wird benachrichtigt]
    E4 --> E5([Prozess für diese Anfrage beendet])
    E3 -- Annehmen --> E6[Status: FIRST_EXAMINER_ACCEPTED\nStudierende:r wählt Zweitprüfer:in]
    E6 --> E7[Zweitprüfer:in-Präferenzen pflegen\nOptional: bevorzugte Kommissionspartner:innen]
    E7 --> E8[Warten bis Zweitprüfer:in zugesagt hat]
    E8 --> E9[Status: MATCHED\nPrüfungskommission vollständig]
    E9 --> E10[Anmeldefähigkeit der/des Studierenden prüfen\nIm PAV-Dashboard falls PAV-Rolle]
    E10 --> E11[Kolloquiumstermin koordinieren]
    E11 --> E12[Prüfungsfähigkeit bestätigen\nIm PAV-Dashboard falls PAV-Rolle]
    E12 --> E13[Kolloquium durchführen]
    E13 --> E14[Kolloquium als abgeschlossen markieren]
    E14 --> E15([Abschlussarbeit abgeschlossen])
```

### 3b. Zweitprüfer:in

```mermaid
flowchart TD
    Z1([Profil anlegen als Zweitprüfer:in]) --> Z2[Einladungs-E-Mail mit JWT-Link erhalten\nNach Auswahl durch Studierende:n]
    Z2 --> Z3{Anfrage annehmen oder ablehnen}
    Z3 -- Ablehnen --> Z4[Ablehnungsgrund angeben\nStudierende:r wird benachrichtigt]
    Z4 --> Z5([Prozess für diese Anfrage beendet])
    Z3 -- Annehmen --> Z6[Status: MATCHED\nPrüfungskommission vollständig]
    Z6 --> Z7[Kolloquiumstermin koordinieren]
    Z7 --> Z8[Kolloquium durchführen]
    Z8 --> Z9([Abschlussarbeit abgeschlossen])
```

### 3c. PAV (Prüfungsausschussvorsitz)

```mermaid
flowchart TD
    P1([PAV-Dashboard öffnen]) --> P2[Unzugeteilte Anträge einsehen\nNach Studiengang gefiltert]
    P2 --> P3{Aktion wählen}
    P3 -- Prüfer:in vorschlagen --> P4[Prüfer:in aus Liste auswählen\nRolle festlegen: Erst- oder Zweitprüfer:in]
    P4 --> P5[Prüfer:in erhält Einladungs-E-Mail]
    P5 --> P6{Prüfer:in antwortet}
    P6 -- Ablehnung --> P2
    P6 -- Annahme --> P7[Antrag zugewiesen]
    P3 -- Direkt zuweisen --> P7
    P7 --> P8[Anmeldefähigkeit prüfen\nNach Einreichung des Antrags]
    P8 --> P9{Anmeldefähigkeit bestätigen?}
    P9 -- Ablehnen --> P10([Prozess abgebrochen])
    P9 -- Bestätigen --> P11[Warten auf Abgabe und Kolloquiumsplanung]
    P11 --> P12[Prüfungsfähigkeit prüfen\nVor dem Kolloquium]
    P12 --> P13{Prüfungsfähigkeit bestätigen?}
    P13 -- Blockieren --> P10
    P13 -- Bestätigen --> P14([Kolloquium kann stattfinden])
```

---

## 4. Kolloquiumsprozess

```mermaid
flowchart TD
    K1([Antrag hat Status MATCHED]) --> K2[Kolloquium anlegen\nDatum, Uhrzeit, Raum, Prüfer:innen]
    K2 --> K3[Status: SCHEDULED\nAlle Beteiligten werden benachrichtigt]
    K3 --> K4{Kolloquium findet statt?}
    K4 -- Abgesagt --> K5[Status: CANCELLED\nNeuen Termin vereinbaren]
    K5 --> K2
    K4 -- Durchgeführt --> K6[Status: COMPLETED\nKolloquium als abgeschlossen markieren]
    K6 --> K7([Abschlussarbeit vollständig abgeschlossen])
```

---

## 5. Rollen im System

```mermaid
flowchart LR
    subgraph Studierende
        ST[student]
    end
    subgraph Prüfende
        EX[examiner\nErstprüfer:in]
        SE[second_examiner\nZweitprüfer:in]
    end
    subgraph Verwaltung
        PAV[pav\nPrüfungsausschuss]
        DEAN[dean\nDekanat]
        ADMIN[admin\nSystemadmin]
        SUPERADMIN[superadmin\nSuperadmin]
    end

    ST -- reicht Antrag ein --> EX
    EX -- schlägt Zweitprüfer:in vor --> SE
    PAV -- weist Prüfer:innen zu --> EX
    PAV -- prüft Anmelde- und Prüfungsfähigkeit --> ST
    DEAN -- exportiert Berichte --> ADMIN
    ADMIN -- verwaltet alle Anträge --> ST
    SUPERADMIN -- verwaltet alle Rollen --> ADMIN
```

---

## 6. E-Mail-Benachrichtigungen im Prozess

```mermaid
sequenceDiagram
    participant S as Studierende:r
    participant SYS as System (HTW Berlin)
    participant E1 as Erstprüfer:in
    participant E2 as Zweitprüfer:in
    participant PAV as PAV

    S->>SYS: Antrag einreichen
    SYS->>S: Bestätigung: Antrag eingegangen
    PAV->>SYS: Erstprüfer:in zuweisen
    SYS->>E1: E-Mail mit JWT-Link (Annehmen / Ablehnen)
    E1->>SYS: Anfrage annehmen
    SYS->>S: Benachrichtigung: Erstprüfer:in hat zugesagt
    S->>SYS: Zweitprüfer:in auswählen
    SYS->>E2: E-Mail mit JWT-Link (Annehmen / Ablehnen)
    E2->>SYS: Anfrage annehmen
    SYS->>S: Benachrichtigung: Status MATCHED
    SYS->>E1: Benachrichtigung: Prüfungskommission vollständig
    SYS->>E2: Benachrichtigung: Prüfungskommission vollständig
    PAV->>SYS: Anmeldefähigkeit bestätigen
    SYS->>S: Benachrichtigung: Anmeldefähigkeit bestätigt
    S->>SYS: Arbeit abgeben
    PAV->>SYS: Prüfungsfähigkeit bestätigen
    SYS->>S: Benachrichtigung: Prüfungsfähigkeit bestätigt
    SYS->>E1: Kolloquiumstermin-Erinnerung
    SYS->>E2: Kolloquiumstermin-Erinnerung
```

---

## 7. Statusübergänge (vollständige Übersicht)

```mermaid
stateDiagram-v2
    [*] --> PENDING : Antrag eingereicht
    PENDING --> PENDING_FIRST_EXAMINER : Antrag aktiviert
    PENDING --> WITHDRAWN : Zurueckgezogen
    PENDING --> CANCELLED : Storniert
    PENDING --> REJECTED : Abgelehnt

    PENDING_FIRST_EXAMINER --> FIRST_EXAMINER_ACCEPTED : Erstprueferin nimmt an
    PENDING_FIRST_EXAMINER --> FIRST_EXAMINER_REJECTED : Erstprueferin lehnt ab
    PENDING_FIRST_EXAMINER --> WITHDRAWN : Zurueckgezogen

    FIRST_EXAMINER_REJECTED --> PENDING_FIRST_EXAMINER : Neue Anfrage

    FIRST_EXAMINER_ACCEPTED --> PENDING_SECOND_EXAMINER : Zweitprueferin gewaehlt
    FIRST_EXAMINER_ACCEPTED --> WITHDRAWN : Zurueckgezogen

    PENDING_SECOND_EXAMINER --> MATCHED : Zweitprueferin nimmt an
    PENDING_SECOND_EXAMINER --> PENDING_SECOND_EXAMINER : Neue Auswahl

    MATCHED --> COMPLETED : Kolloquium abgeschlossen
    MATCHED --> CANCELLED : Storniert

    COMPLETED --> [*]
    WITHDRAWN --> [*]
    CANCELLED --> [*]
    REJECTED --> [*]
```

---

*Dokument erstellt für die HTW Berlin – University of Applied Sciences.*
*Stand: Juni 2026*
