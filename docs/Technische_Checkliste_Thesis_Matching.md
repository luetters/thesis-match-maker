# Technische Umsetzungscheckliste: Thesis Matching an der HTW Berlin

**Zweck:** Diese Checkliste dient als prüfbare Grundlage für Entwicklung, Abnahme, Betrieb und Migration des Thesis-Matching-Systems auf eine eigenständige Serverumgebung. Sie setzt voraus, dass die Anwendung **ohne Abhängigkeit von Manus** auf einem selbst verwalteten Server betrieben werden kann.

> **Abnahmeregel:** Ein Punkt gilt erst als erfüllt, wenn er technisch umgesetzt, getestet, dokumentiert und einer verantwortlichen Rolle zugeordnet wurde.

## 1. Zielarchitektur und Betriebsgrenzen

| Prüfbereich | Muss-Anforderung | Abnahmehinweis |
|---|---|---|
| Laufzeit | Node.js-Laufzeit mit Produktionsstartskript | Start ohne externe Plattformdienste reproduzierbar |
| Frontend | React-Anwendung als statische Auslieferung hinter Reverse Proxy | Produktions-Build und Caching geprüft |
| API | Express-Server mit typisierten tRPC-Endpunkten | API ist nur über abgesicherte Routen erreichbar |
| Datenbank | MySQL- oder kompatible TiDB-Instanz | Migrationsweg und Backups getestet |
| Objektablage | S3-kompatibler Speicher, z. B. IONOS oder Hetzner | Dokumente sind nicht öffentlich auflistbar |
| E-Mail | SMTP-Server für Systembenachrichtigungen | Versand, Fehlerbehandlung und Vorlagen geprüft |
| Scheduler | Eigenständiger node-cron- oder vergleichbarer Scheduler | Erinnerungen und Backups laufen ohne Plattformdienst |
| Reverse Proxy | TLS-Terminierung und Weiterleitung, z. B. Nginx oder Caddy | HTTPS, Weiterleitungen und Sicherheitsheader geprüft |

## 2. Kernfunktionen des fachlichen Prozesses

### Registrierung und Rollen

- [ ] Studierende können sich mit E-Mail und eigenem Passwort registrieren.
- [ ] Die Registrierung weist klar darauf hin, dass das Passwort nicht dem Passwort der HTW Berlin entsprechen darf.
- [ ] Erstprüfer:innen geben bei der Anmeldung den akademischen Titel optional und den eigenen Fachbereich verpflichtend an.
- [ ] Externe Zweitgutachter:innen sind als separate Rolle erkennbar und erhalten keine Erstprüfungsrechte.
- [ ] Erstprüfer:innen erhalten automatisch die zugehörigen Zweitprüfungsrechte.
- [ ] Rollenfreigaben sind erst nach expliziter administrativer Entscheidung aktiv.
- [ ] Die zuständige Verwaltung kann Studierende und Erstprüfer:innen des eigenen Fachbereichs freigeben; fachbereichsübergreifende Sonderfälle bleiben Superadmins vorbehalten.

### Thesis Matching und Betreuung

- [ ] Studierende können Thema, Studiengang und Kontext in einer Betreuungsanfrage erfassen.
- [ ] Die Suche nach Erstprüfer:innen unterstützt mindestens Fachbereich, Studiengang, fachliche Ausrichtung und sichtbare Kapazität.
- [ ] Erstprüfer:innen können Anfragen nachvollziehbar annehmen oder ablehnen.
- [ ] Studierende können nach der Erstzusage eine Zweitprüfung anfragen.
- [ ] Zweitprüfer:innen sehen Thema und die für ihre Aufgabe freigegebenen Dokumente der zugeordneten Fälle.
- [ ] Zweitprüfer:innen können keine Erinnerungen an Erstprüfer:innen auslösen.
- [ ] Der Status der Kommission ist für die zuständigen Beteiligten verständlich sichtbar.

### Fachbereichsverwaltung und Fristen

- [ ] Fachbereichsverwaltung sieht nur die ihr zugeordneten Studierendenfälle und Erstprüfer:innenfreigaben.
- [ ] Fachbereichslose Altfälle sind für Superadmins sichtbar und können direkt zugeordnet werden.
- [ ] Offene Freigaben können nach Name, E-Mail, Rolle und Fachbereich gesucht und gefiltert werden.
- [ ] Abgabetermine können je Studiengang, Semester und Einzelfall geführt werden; Änderungen werden begründet protokolliert.
- [ ] Kolloquiumsplanung startet erst, wenn die Verwaltung die Verteidigungsfähigkeit freigegeben hat.

## 3. Schnittstellenvertrag

| Schnittstelle | Richtung | Zweck | Mindestkontrollen |
|---|---|---|---|
| Browser ↔ API | HTTPS | Anmeldung, Fachprozesse und Verwaltungsoberfläche | Session-Cookie, CSRF-Schutz, Rate Limiting, Eingabevalidierung |
| API ↔ Datenbank | Internes Netzwerk | Persistenz von Rollen, Anfragen, Fristen und Audit-Logs | Least-Privilege-Datenbankkonto, TLS sofern verfügbar, tägliche Sicherung |
| API ↔ S3-Speicher | HTTPS | Upload und Abruf von Dokumenten | Private Buckets, kurzlebige signierte URLs, Metadatenprüfung |
| API ↔ SMTP | TLS/STARTTLS | Freigaben, Erinnerungen, Passwortzurücksetzungen | Zugangsdaten in Secret Store, Zustellfehler protokollieren |
| Scheduler ↔ API/DB | Intern | Fristerinnerungen, 2FA-Hinweise, Backups | Idempotente Jobs, Ausführungsprotokoll, Fehleralarm |
| Optional: SAML 2.0 ↔ Identity Provider | HTTPS | Alternativer Hochschul-Login | Metadata-Austausch, signierte Assertions, Test- und Fallbackmodus |

## 4. Datenmodell und Datenminimierung

| Datenklasse | Notwendige Inhalte | Schutzanforderung |
|---|---|---|
| Nutzerkonto | Name, E-Mail, Passwort-Hash, Rolle, Fachbereich, bevorzugte Sprache | Zugriff strikt nach Rolle; Passwort niemals lesbar speichern |
| Thesis-Anfrage | Thema, Studiengang, Fachbereich, Betreuungsstatus, Zeitstempel | Zugriff ausschließlich für zugeordnete Personen und zuständige Verwaltung |
| Dokumente | Dateireferenz, Typ, Freigabestatus, Zeitstempel | Private Objektablage; kein öffentlicher Bucket-Zugriff |
| Audit-Log | Aktion, Zeitpunkt, handelnde Rolle, fachlicher Bezug | Manipulationsarme Speicherung; datensparsame Anzeige |
| Sicherheitsdaten | Fehlgeschlagene Logins, 2FA-Status, Scheduler-Fehler | Zugriff nur für berechtigte Administrationsrollen |

- [ ] Für jede Tabelle sind Zweck, Aufbewahrungsfrist und Lösch- bzw. Archivierungsregel dokumentiert.
- [ ] Persönliche Daten werden nur erhoben, wenn sie für Anmeldung, Rollenprüfung, Betreuungsprozess oder Prüfungsakte erforderlich sind.
- [ ] Exporte schützen CSV-Zellen gegen Formelinterpretation.
- [ ] Staging- und Testsysteme verwenden keine echten Personen- oder Dokumentdaten.

## 5. Sicherheit und Zugriffskontrolle

Die technische Sicherheitsprüfung sollte sich an einem nachvollziehbaren Standard orientieren. Der OWASP Application Security Verification Standard stellt hierfür Anforderungen für die Überprüfung technischer Sicherheitskontrollen bereit.[1] Die folgenden Punkte sind als projektspezifische Mindestbasis zu behandeln.

### Anmeldung und Sitzungen

- [ ] Passwörter werden mit einem modernen, adaptiven Passwort-Hash gespeichert; Klartextpasswörter werden nie protokolliert.
- [ ] Anmeldung und alle authentifizierten Seiten sind ausschließlich über TLS erreichbar.[2]
- [ ] Fehlermeldungen bei Anmeldung und Passwortzurücksetzung verraten nicht, ob ein Konto existiert.[2]
- [ ] Rate Limiting, Login-Protokoll und Schutz gegen automatisierte Anmeldeversuche sind aktiv.
- [ ] Zwei-Faktor-Authentifizierung ist für berechtigte Rollen verfügbar; verpflichtende Rollen und Fristen sind konfigurierbar.
- [ ] Wiederherstellungscodes werden nur einmalig angezeigt und sicher abgelegt.
- [ ] Nach Passwortzurücksetzung oder Änderung sicherheitskritischer Kontodaten wird eine erneute Anmeldung verlangt.[2]

### Autorisierung und Datenzugriff

- [ ] Jede tRPC-Mutation prüft serverseitig Rolle, Fachbereich und Objektzuordnung; reine Frontend-Ausblendung reicht nicht aus.
- [ ] Dokumentzugriff prüft vor Erzeugung einer Download-URL die konkrete Fallzuordnung.
- [ ] Zweitprüfer:innen sehen nur zugewiesene Fälle; Verwaltung sieht nur den eigenen Fachbereich.
- [ ] Superadmin-Funktionen für fachbereichsübergreifende Sonderfälle sind vom normalen Verwaltungszugriff getrennt.
- [ ] Bearbeitungen an Rollen, Fachbereichen, Fristen und Statuswerten werden auditierbar protokolliert.

### Eingaben, Dateien und Abhängigkeiten

- [ ] Alle Eingaben sind serverseitig gegen Schema validiert; Rich-Text wird bereinigt und als sicherer Klartext bzw. sicher gerendert ausgegeben.
- [ ] Datenbankabfragen verwenden typsichere ORM-Aufrufe oder parametrisierte Queries.
- [ ] Uploads prüfen Dateityp, Größe, Berechtigung und erlaubte Endungen vor Speicherung.
- [ ] Secrets liegen ausschließlich in einem Secret Store oder geschützten Umgebungsvariablen; sie werden nie ins Repository übernommen.
- [ ] Abhängigkeiten werden regelmäßig auf bekannte Schwachstellen geprüft und versioniert aktualisiert.

## 6. Betrieb, Beobachtbarkeit und Wiederherstellung

| Bereich | Prüfpunkte |
|---|---|
| Monitoring | Uptime, HTTP-Fehler, Scheduler-Läufe, E-Mail-Fehler, S3-Verbindung und Speicherplatz sichtbar machen |
| Logging | Strukturierte Serverlogs, Audit-Log und sichere Fehlerdetails; keine Passwörter oder Zugangstokens protokollieren |
| Backups | Datenbank und relevante S3-Metadaten regelmäßig sichern; Wiederherstellung mindestens vor Produktivsetzung testen |
| Updates | Wartungsfenster, Rollback-Plan und Sicherheitsupdates dokumentieren |
| Incident Response | Zuständigkeiten, Kontaktweg, Bewertung, Eindämmung, Wiederherstellung und Nachbereitung festlegen |
| Datenschutz | Verzeichnis der Verarbeitungstätigkeiten, Berechtigungskonzept, Löschkonzept und Auftragsverarbeitung mit Infrastrukturpartnern prüfen |

## 7. Test- und Abnahmematrix

| Ebene | Mindesttest | Akzeptanzkriterium |
|---|---|---|
| Unit | Rollenregeln, Fristlogik, Input-Bereinigung, Export-Schutz | Vitest-Tests laufen reproduzierbar ohne Fehler |
| Integration | Registrierung, Freigabe, Zuordnung, Dokumentzugriff und Benachrichtigungen | Jeder Prozessschritt prüft echte Berechtigungsgrenzen |
| E2E | Studierende → Erstprüfung → Zweitprüfung → Verwaltung | Der vollständige Prozess kann in einer Testumgebung abgeschlossen werden |
| Security | Zugriffskontrolle, Upload, Session, XSS, CSRF, Rate Limiting | Befunde werden dokumentiert, bewertet und vor Produktivsetzung geschlossen oder akzeptiert |
| Recovery | Datenbank- und Objektablage-Restore | Wiederherstellung ist dokumentiert und erfolgreich erprobt |
| Usability | Rollenbezogene Akzeptanztests mit repräsentativen Nutzer:innen | Kritische Schritte sind ohne externe Unterstützung verständlich |

## 8. Go-Live-Gate

- [ ] Fachliche Akzeptanz durch Studierende, Erstprüfer:innen, Zweitprüfer:innen und Verwaltung dokumentiert.
- [ ] Rollen- und Fachbereichsmatrix fachlich freigegeben.
- [ ] TLS, DNS, E-Mail-Absender und Monitoring produktiv getestet.
- [ ] Backup und Wiederherstellung erfolgreich erprobt.
- [ ] Sicherheitscheck und Abhängigkeitsprüfung ohne unbewertete kritische Befunde.
- [ ] Datenschutz- und Betriebsdokumentation vollständig.
- [ ] Rückfallplan für Anmeldung, Datenbank und Objektablage vorhanden.

## Referenzen

[1] [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/) – Grundlage für die Prüfung technischer Sicherheitskontrollen in Webanwendungen.  
[2] [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) – Empfehlungen zu TLS, Passwortspeicherung, sicheren Fehlermeldungen und erneuter Authentifizierung bei sensiblen Änderungen.
