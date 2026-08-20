# Konzept: Automatische E-Mail-Benachrichtigungen für die Freigabeliste

**Geltungsbereich:** Neue Registrierungs- und Rollenfreigabeanträge, nachträgliche Fachbereichszuordnungen sowie Änderungen des Freigabestatus im Thesis-Matching-System der **HTW Berlin**.

**Ziel:** Berechtigte Personen sollen zeitnah und ohne manuelle Rundmails über handlungsrelevante Vorgänge informiert werden. Die Freigabeliste bleibt dabei die verbindliche Arbeitsoberfläche; die E-Mail weist lediglich auf den Vorgang hin und führt nach Anmeldung zum aktuellen Datensatz.

> **Leitprinzip:** Eine E-Mail informiert über eine Aufgabe oder einen Status. Sie enthält weder sensible Dokumente noch vertrauliche Detaildaten und berechtigt nicht unmittelbar zu einer Aktion.

## 1. Ausgangslage und Zielbild

Die Freigabeliste verarbeitet mehrere Rollenarten mit unterschiedlichen Zuständigkeiten. Eine neue Studierendenregistrierung ist für die Verwaltung des zugehörigen Fachbereichs relevant. Eine interne Erstprüfer:innenregistrierung ist dem angegebenen Fachbereich zuzuordnen. Externe Zweitgutachter:innen und fachbereichslose Altfälle benötigen hingegen eine Bearbeitung durch Superadmins. Ohne eine gerichtete Benachrichtigung besteht das Risiko, dass offene Vorgänge übersehen werden oder unbeteiligte Personen unnötige E-Mails erhalten.

Das Zielbild verbindet daher eine **ereignisgesteuerte Information bei neuen oder geänderten Vorgängen** mit einer **geplanten Erinnerung für weiterhin offene Fälle**. Die Zuständigkeit wird aus Rolle und Fachbereich ermittelt, nicht aus breit gestreuten Verteilerlisten.

| Ziel | Konkrete Wirkung |
|---|---|
| Zeitnahe Bearbeitung | Zuständige Personen erhalten einen Hinweis, sobald eine Handlung erforderlich ist. |
| Datensparsamkeit | Nur Empfänger:innen mit Fachbereichs- oder Superadmin-Zuständigkeit werden einbezogen. |
| Nachvollziehbarkeit | Versand, Zustellversuche und Unterdrückungen sind am Vorgang auditierbar. |
| Eigenbetrieb | Versand erfolgt über den konfigurierten SMTP-Dienst und benötigt keinen Plattformdienst. |
| Nutzerkontrolle | Optional abonnierbare Verwaltungs- und Erinnerungsmails folgen den individuellen Benachrichtigungseinstellungen. |

## 2. Ereignisse, Empfänger:innen und Inhalte

Die nachstehende Matrix trennt bewusst **verbindliche Statusinformationen für die antragstellende Person** von **optionalen Arbeitsbenachrichtigungen für die Verwaltung**. Alle Benachrichtigungen verwenden die bevorzugte Sprache der Empfängerin oder des Empfängers, sofern eine Übersetzung vorliegt.

| Ereignis | Primäre Empfänger:innen | Bedingung | Kerninhalt | Kategorie |
|---|---|---|---|---|
| Neue Studierendenregistrierung | Verwaltung des Fachbereichs; optional Superadmins | Studiengang/Fachbereich liegt vor | Name, E-Mail, Studiengang, Fachbereich, Link zur Freigabeliste | Verwaltungsaufgabe |
| Neue interne Erstprüfer:innenregistrierung | Verwaltung des angegebenen Fachbereichs; optional Superadmins | Fachbereich ist gültig | Name, Titel, E-Mail, Fachbereich, Link zur Freigabeliste | Verwaltungsaufgabe |
| Neue externe Zweitgutachter:innenregistrierung | Superadmins | Rolle ist `second_examiner` ohne Fachbereich | Name, E-Mail, Kennzeichnung „extern“, Link zur Freigabeliste | Superadmin-Aufgabe |
| Neuer Verwaltungsantrag | Superadmins | Rolle ist Verwaltung | Name, E-Mail, beantragter Fachbereich, Link zur Freigabeliste | Superadmin-Aufgabe |
| Fachbereichsloser Altfall erkannt | Superadmins | Ausstehende Erstprüfer:innenregistrierung ohne Fachbereich | Anzahl und Link zur gefilterten Freigabeliste, keine Sammel-E-Mail je Lauf | Datenqualitätswarnung |
| Fachbereich nachgetragen | Antragssteller:in; optional zuständige Verwaltung | Zuordnung erfolgreich gespeichert | Zugeordneter Fachbereich, nächster Bearbeitungsschritt | Statusinformation |
| Antrag freigegeben | Antragssteller:in | Freigabe erfolgreich gespeichert | Rolle, Fachbereich, Zugangshinweis und nächster Schritt | Statusinformation |
| Antrag abgelehnt | Antragssteller:in | Ablehnung erfolgreich gespeichert | Rolle, begründeter nächster Schritt oder Kontaktweg; keine internen Details | Statusinformation |
| Status vor Freigabe geändert | Zuständige Bearbeiter:innen | z. B. Zuordnung oder Korrektur von Rollendaten | Art der Änderung und Link zum Vorgang | Verwaltungsaufgabe |

### Empfängerauflösung

Die Empfängerauflösung wird zentral im Backend implementiert und vor jedem Versand erneut geprüft. Eine reine UI-Filterung ist unzulässig, weil sie sich nicht als Autorisierungsentscheidung eignet.

| Antragstyp | Zuständigkeit für Arbeitsmail | Freigabegrenze |
|---|---|---|
| Studierende | Verwaltung des Studienfachbereichs | Verwaltung des Fachbereichs oder Superadmin |
| Interne Erstprüfer:innen | Verwaltung des angegebenen Fachbereichs | Verwaltung des Fachbereichs oder Superadmin |
| Externe Zweitgutachter:innen | Superadmin | Superadmin |
| Verwaltung | Superadmin | Superadmin |
| Unvollständiger Altfalleintrag | Superadmin | Fachbereich zunächst nachtragen; danach reguläre Zuordnung |

## 3. Entscheidungsvorlage für den Versandbetrieb

Für das System sind zwei dauerhaft tragfähige Betriebsvarianten möglich. Beide Varianten funktionieren ohne KI-Entscheidungen, ohne Polling fremder Systeme und mit dem vorhandenen SMTP-Dienst. Die Entscheidung betrifft vor allem die gewünschte Reaktionszeit und das E-Mail-Aufkommen.

| Ansatz | Ablauf und Nutzen | Aufwand | Laufende Kosten | Eignung |
|---|---|---|---|---|
| **Sofortinformation mit zuverlässiger Versandwarteschlange** | Der Antrag oder Statuswechsel erzeugt in derselben Datenbanktransaktion einen Versandauftrag. Ein Versandprozess liefert die E-Mail unmittelbar nach der Änderung aus; fehlgeschlagene Versuche werden später erneut zugestellt. | Mittel | SMTP- und Serverbetrieb; kein externer Plattformdienst nötig | Für zeitkritische Freigaben und klar abgegrenzte Empfängergruppen |
| **Gebündelte Arbeitsübersicht** | Ein geplanter Versand fasst neue und weiterhin offene Fälle je Empfänger:in zusammen, beispielsweise werktags morgens. Statusinformationen an Antragstellende können dennoch unmittelbar versendet werden. | Niedrig bis mittel | SMTP- und Serverbetrieb; kein externer Plattformdienst nötig | Für Fachbereichsverwaltungen mit hohem Eingang oder geringer E-Mail-Toleranz |

Die endgültige Wahl sollte die HTW Berlin anhand der gewünschten Reaktionszeit und der erwarteten Anzahl täglicher Anträge treffen. Unabhängig davon empfiehlt sich eine einheitliche technische Grundlage mit Versandwarteschlange; sie erlaubt später den Wechsel zwischen Sofort- und Sammelversand ohne Änderung der Fachlogik.

## 4. Technisches Ereignis- und Versandkonzept

### 4.1 Fachliche Kette

1. Eine geschützte Mutation erstellt einen Antrag oder ändert dessen Status.
2. Die Mutation validiert Rolle, Fachbereich, Bearbeitungsrecht und Eingabedaten.
3. In **derselben Datenbanktransaktion** werden sowohl die fachliche Änderung als auch ein Eintrag in der Versandwarteschlange gespeichert.
4. Nach erfolgreichem Commit löst der Server einen Versandversuch aus oder ein geplanter Hintergrundlauf nimmt den Auftrag zeitnah auf.
5. Der Versanddienst löst die berechtigten Empfänger:innen erneut auf, prüft deren Präferenzen, rendert die sprachabhängige Vorlage und übergibt die E-Mail an SMTP.
6. Ergebnis, Zeitstempel und bereinigte Fehlerinformationen werden am Versandauftrag gespeichert. Der fachliche Vorgang bleibt dabei unverändert.

> Das Speichern eines Versandauftrags in derselben Transaktion verhindert, dass eine erfolgreich angenommene oder abgelehnte Freigabe ohne nachvollziehbaren Versandauftrag bleibt, wenn der Server direkt danach ausfällt.

### 4.2 Vorschlag für Datenstrukturen

| Tabelle bzw. Entität | Wesentliche Felder | Zweck |
|---|---|---|
| `notification_outbox` | `id`, `eventType`, `entityType`, `entityId`, `occurredAt`, `dedupeKey`, `status`, `attemptCount`, `nextAttemptAt` | Zuverlässige, wiederholbare Versandwarteschlange |
| `notification_delivery` | `id`, `outboxId`, `recipientUserId`, `templateKey`, `locale`, `status`, `sentAt`, `errorCode` | Empfängerbezogener Versandnachweis ohne Volltextspeicherung |
| `email_notification_preferences` | `userId`, Kategorie-Schalter, `updatedAt` | Individuelle Wahl optionaler Verwaltungs- und Erinnerungsmails |
| `audit_logs` | Aktion, fachlicher Bezug, handelnde Rolle, Zeitstempel | Unabhängige Historie fachlicher Änderungen |

Eine `dedupeKey` sollte mindestens aus Ereignistyp, Vorgangs-ID und fachlicher Versionsnummer bestehen. Dadurch löst ein wiederholter Request oder ein erneuter Hintergrundlauf nicht mehrere identische E-Mails aus. Der Versanddienst darf nur Aufträge mit Status `pending` oder `retry` verarbeiten und muss den Status beim Reservieren atomar auf `processing` setzen.

### 4.3 Versandzustände und Wiederholungen

| Versandzustand | Bedeutung | Nächste Aktion |
|---|---|---|
| `pending` | Auftrag wurde transaktional erzeugt. | Sofortversuch oder Aufnahme durch Hintergrundlauf. |
| `processing` | Ein Worker bearbeitet den Auftrag. | Zeitlimit überwachen; bei Abbruch kontrolliert zurücksetzen. |
| `sent` | SMTP-Übergabe war erfolgreich. | Versandnachweis speichern, keine Wiederholung. |
| `suppressed` | Präferenz, fehlende Berechtigung oder Duplikatschutz verhindert Versand. | Grund protokollieren, nicht erneut versenden. |
| `retry` | Temporärer SMTP- oder Netzwerkfehler. | Wiederholung mit gestaffelter Wartezeit. |
| `failed` | Endgültiger Fehler nach definierter Maximalzahl von Versuchen. | Fehleralarm für Superadmins und manuelle Prüfung. |

Empfohlen wird eine begrenzte, gestaffelte Wiederholung, beispielsweise nach 5 Minuten, 30 Minuten, 2 Stunden und am Folgetag. Die genaue Maximalzahl und Aufbewahrungsfrist sollen im Betriebs- und Datenschutzkonzept der HTW Berlin festgelegt werden.

## 5. E-Mail-Vorlagen und Nutzererlebnis

Die Nachricht muss eine Aufgabe verständlich machen, ohne das Portal in der E-Mail nachzubilden. Sie enthält deshalb einen klaren Betreff, den Grund der Nachricht, den erforderlichen nächsten Schritt und einen Link zur angemeldeten Ansicht. Der Link enthält **keinen** Freigabeschlüssel und führt nur nach regulärer Anmeldung zur aktuellen Freigabeliste.

| Vorlage | Beispielbetreff | Primäre Handlung |
|---|---|---|
| Neue Freigabe | „Neue Erstprüfer:innenregistrierung für FB3 wartet auf Freigabe“ | Freigabeliste öffnen und prüfen |
| Fachbereich fehlt | „Handlung erforderlich: Fachbereich für offenen Prüfer:innenfall ergänzen“ | Fachbereich in der Freigabeliste zuordnen |
| Freigabe bestätigt | „Ihre Rolle im Thesis-Matching-System wurde freigegeben“ | Anmelden und nächste Schritte prüfen |
| Freigabe abgelehnt | „Rückmeldung zu Ihrer Rollenregistrierung“ | Hinweis lesen und gegebenenfalls Kontakt aufnehmen |
| Sammelübersicht | „Tägliche Übersicht offener Freigaben“ | Gefilterte Freigabeliste öffnen |

### Sprach- und Präferenzregeln

- Statusinformationen an Antragssteller:innen werden in der hinterlegten bevorzugten Sprache versendet.
- Arbeitsbenachrichtigungen für Verwaltung und Superadmins verwenden ebenfalls die bevorzugte Sprache, fallen aber bei fehlender Übersetzung auf Deutsch zurück.
- Optionale Kategorien, insbesondere tägliche Übersichten und Erinnerungen, respektieren die individuellen Benachrichtigungseinstellungen.
- Sicherheits- oder rechtlich notwendige Systeminformationen werden als gesonderte Kategorie geführt und nicht mit normalen Arbeitsmails vermischt.
- Ein Opt-out-Link darf nur Präferenzen ändern; er darf keinen Zugriff auf Freigabeaktionen ermöglichen.

## 6. Datenschutz und Sicherheit

E-Mails sind kein vertraulicher Arbeitsplatz. Daher werden sie datensparsam formuliert. Der Betreff enthält keine Matrikelnummer, kein Thesis-Thema, keine Dokumentnamen und keine Gründe für eine Ablehnung. Bei personenbezogenen Daten werden nur Name, Rolle und fachlicher Kontext verwendet, soweit dies für die Arbeitserledigung notwendig ist.

| Risiko | Schutzmaßnahme |
|---|---|
| Unbefugte Empfänger:innen | Empfängerauflösung im Backend mit Rolle, Fachbereich und aktuellem Status; erneute Prüfung unmittelbar vor Versand |
| Mehrfachversand | Transaktionale Outbox und eindeutiger Duplikatschlüssel |
| Veraltete Informationen | Link führt nach Anmeldung auf die aktuelle Ansicht; E-Mail ist keine Quelle für Statusentscheidungen |
| Preisgabe sensibler Daten | Keine Anhänge und keine vertraulichen Details; Dokumente ausschließlich über autorisierten Portalzugriff |
| SMTP-Ausfall | Wiederholungslogik, Fehlerstatus und Superadmin-Hinweis bei endgültigem Fehlschlag |
| Manipulation von Aktionen | Keine Magic Links oder Aktions-URLs in Benachrichtigungen; jede Aktion erfordert eine reguläre Sitzung |
| Missbrauch von Konten | TLS, sichere Passwortspeicherung, generische Loginfehler, Rate Limiting und Zwei-Faktor-Authentifizierung für sensitive Rollen nach aktuellem Sicherheitskonzept [1] [2] |

Der OWASP Application Security Verification Standard kann als Prüfraster für technische Sicherheitskontrollen dienen.[1] Für Anmeldung, sichere Fehlermeldungen, TLS und erneute Authentifizierung bei sensiblen Änderungen sind die Authentifizierungsempfehlungen der OWASP Cheat Sheet Series zu berücksichtigen.[2]

## 7. Fehler-, Monitoring- und Betriebsregeln

| Bereich | Mindestregel | Sichtbarkeit |
|---|---|---|
| SMTP-Verbindung | Verbindung beim Speichern der Konfiguration testbar; Fehlerdetails werden bereinigt angezeigt | Superadmin-Systemstatus |
| Zustellfehler | Zustellversuche zählen, Fehlercode ohne Zugangsdaten speichern | Versandprotokoll und Superadmin-Hinweis |
| Warteschlange | Anzahl `pending`, `retry` und `failed` überwachen | Systemstatus-Dashboard |
| Stau | Aufträge, die länger als definierte Zeit offen sind, als Warnung ausweisen | Superadmin-Dashboard |
| Vorlagen | Versandversion und Sprache pro Zustellung speichern | Auditierbare Versandhistorie |
| Datenschutz | Vollständige E-Mail-Inhalte nicht dauerhaft im Log speichern | Datenschutz- und Betriebskonzept |

## 8. Umsetzungsphasen und Abnahmekriterien

| Phase | Umfang | Abnahmekriterium |
|---|---|---|
| 1. Grundlage | Outbox-Tabellen, SMTP-Adapter, Vorlagenbasis, Versandprotokoll | Testmail und Wiederholungslogik funktionieren ohne Fachprozessänderung |
| 2. Neue Anträge | Ereignisse für Studierende, Erstprüfer:innen, externe Zweitgutachter:innen und Verwaltung | Nur zuständige Empfänger:innen erhalten genau eine Arbeitsmail |
| 3. Statusänderungen | Freigabe, Ablehnung, Fachbereichszuordnung, sprachabhängige Statusmails | Antragssteller:in erhält nachvollziehbaren Status ohne interne Informationen |
| 4. Erinnerungen | Sammelübersicht und Altfälle-Warnung mit Präferenzschaltern | Keine E-Mail bei deaktivierter optionaler Kategorie; offene Fälle erscheinen im definierten Rhythmus |
| 5. Betrieb | Monitoring, Fehleralarm, Datenschutzprüfung und Wiederherstellungstest | Fehlerzustände sind sichtbar, nachvollziehbar und bearbeitbar |

### Pflicht-Testfälle

- [ ] Neue Erstprüfer:innenregistrierung für FB3 benachrichtigt nur die berechtigte FB3-Verwaltung und gegebenenfalls Superadmins gemäß Konfiguration.
- [ ] Externe Zweitgutachter:innenregistrierung benachrichtigt keine Fachbereichsverwaltung ohne Zuständigkeit.
- [ ] Ein neuer Antrag erzeugt auch bei wiederholtem Klick nur eine einzige Zustellung je Empfänger:in und Ereignis.
- [ ] Freigabe und Ablehnung senden eine sprachabhängige Statusinformation an die antragstellende Person.
- [ ] Deaktivierte optionale Verwaltungsbenachrichtigungen erzeugen einen nachvollziehbaren Status `suppressed` statt eines Versandfehlers.
- [ ] Temporärer SMTP-Fehler führt zu einer kontrollierten Wiederholung; endgültiges Scheitern erzeugt eine sichtbare Warnung.
- [ ] E-Mail-Links führen ohne gültige Sitzung nie direkt zu einer Bearbeitungsaktion.
- [ ] Die Freigabeliste bleibt vollständig nutzbar, wenn SMTP vorübergehend nicht erreichbar ist.

## 9. Offene fachliche Entscheidungen

Vor der Implementierung sollten die folgenden Entscheidungen von der HTW Berlin getroffen und im Administrationshandbuch festgehalten werden.

1. Soll bei neuen Anträgen ausschließlich sofort informiert werden, ausschließlich als Sammelübersicht oder in einer Kombination beider Varianten?
2. Sollen Superadmins bei jeder fachbereichsbezogenen Registrierung zusätzlich informiert werden oder nur bei fachbereichslosen bzw. eskalierten Fällen?
3. Nach welchem Zeitraum gilt eine Freigabe als erinnerungswürdig: fünf, sieben oder zehn Kalendertage?
4. Welche Kategorien dürfen einzelne Nutzer:innen deaktivieren und welche Statusinformationen gelten als zwingende Systemkommunikation?
5. Wie lange sollen Versandprotokolle, Fehlermeldungen und Altfälle-Hinweise aufbewahrt werden?

## Referenzen

[1] [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/) – prüfbare Anforderungen für technische Sicherheitskontrollen in Webanwendungen.  
[2] [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) – Leitlinien zu TLS, Passwortschutz, sicheren Fehlermeldungen und erneuter Authentifizierung bei sensiblen Vorgängen.
