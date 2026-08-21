# Bestandsaufnahme für den unabhängigen Betrieb

**Projekt:** Thesis Match Maker für die HTW Berlin  
**Stand der Prüfung:** 21. August 2026  
**Prüfziel:** Vorbereitung eines vollständig eigenständigen Betriebs auf einem Server bei IONOS oder Hetzner, ohne Abhängigkeit von der aktuellen Plattform.

## Kurzüberblick in zehn Zeilen

1. Die Anwendung ist eine **Web-Anwendung mit eigenem Server**, nicht nur eine statische Website.
2. Der sichtbare Teil ist eine React-Anwendung; der Server ist Node.js mit Express und tRPC.
3. Die produktive Datenhaltung ist eine MySQL-kompatible Datenbank mit derzeit **49 Tabellen**.
4. Anmeldungen erfolgen mit E-Mail und Passwort; optional sind TOTP-Zwei-Faktor-Authentifizierung und SAML vorgesehen.
5. E-Mails werden bereits über einen austauschbaren SMTP-Server versandt.
6. Dateispeicher kann auf das lokale Server-Dateisystem oder S3-kompatiblen Speicher von IONOS oder Hetzner umgestellt werden.
7. Zwei tägliche Hintergrundaufgaben können lokal mit node-cron ausgeführt werden.
8. Docker- und Docker-Compose-Dateien für MySQL und die Anwendung sind bereits vorhanden.
9. Vor dem Umzug müssen Datenbank, private Uploads, aktuelle Geheimnisse und die DNS-Einträge gesichert werden.
10. Es gibt eine wichtige technische Prüfung: Das Live-Datenbankschema verwendet teilweise ältere bzw. abweichende Spaltennamen und muss **als echte Datenbankstruktur**, nicht nur aus dem Quellcode, exportiert werden.

## 1. Art der Anwendung und Laufzeit

Die Anwendung ist eine mehrschichtige Web-Anwendung. Ein Browser lädt die React-Oberfläche. Diese spricht über tRPC mit einem Express-Server. Der Express-Server verarbeitet Anmeldung, Rollenrechte, Uploads, PDF- und CSV-Exporte, E-Mails, Terminabstimmungen und Verwaltungsprozesse. Die Daten liegen in MySQL. Eine externe Plattform wird für den laufenden Betrieb nicht benötigt, wenn Datenbank, E-Mail, Dateispeicher, Umgebungsvariablen und Scheduler ersetzt beziehungsweise lokal betrieben werden.

| Bereich | Tatsächlich verwendete Technik | Festgestellte Version bzw. Zustand |
|---|---|---|
| Programmiersprache | TypeScript / JavaScript | Projekt ist als ES-Modul konfiguriert |
| Frontend | React, Vite, Tailwind CSS 4, Radix UI | React 19.2.1, Vite 7.1.7 |
| Server | Node.js, Express, tRPC | Node.js **v22.13.0**, Express 4.21.2, tRPC 11.6.0 |
| Datenzugriff | Drizzle ORM, mysql2 | Drizzle ORM 0.44.5, mysql2 3.15.0 |
| Datenbank | MySQL-kompatibel | Docker-Definition: MySQL 8.0 |
| Paketverwaltung | pnpm | Laufzeit: **10.4.1**; Lockfile: `pnpm-lock.yaml` |
| Tests | Vitest | 351 Tests bestanden beim letzten Projektcheckpunkt |
| PDF/Export | PDFKit, jsPDF, pdf-lib, xlsx, archiver | im Quellcode vorhanden |
| Servercontainer | Docker | mehrstufige Node-22-Alpine-Definition vorhanden |

**Python ist keine Laufzeitabhängigkeit der Web-Anwendung.** Die im Entwicklungsumfeld vorhandene Python-Version ist daher für den Zielserver nicht erforderlich.

## 2. Quellcode, Konfiguration und Abhängigkeiten

Der Quellcode liegt strukturiert in `client/` (Benutzeroberfläche), `server/` (Server und Fachlogik), `shared/` (gemeinsame Typen und Konstanten), `drizzle/` (Schema und Migrationen), `deploy/` (Containerbetrieb), `docs/` (Dokumentation) und `scripts/` (Wartungshilfen). Die exakte, maschinenlesbare Liste aller direkten und indirekten Abhängigkeiten steht in `package.json` beziehungsweise dem unverzichtbaren Lockfile `pnpm-lock.yaml`.

| Datei | Bedeutung für den Umzug |
|---|---|
| `package.json` | Vollständige Liste direkter Laufzeit- und Entwicklungsabhängigkeiten sowie Start-, Build-, Test- und Migrationsbefehle |
| `pnpm-lock.yaml` | Exakte, reproduzierbare Versionen aller indirekten Abhängigkeiten; muss unverändert mit übernommen werden |
| `patches/wouter@3.7.1.patch` | Projektpatch für die Routing-Bibliothek; muss mit übernommen werden |
| `drizzle.config.ts` | Datenbank- und Migrationskonfiguration |
| `deploy/Dockerfile` | Produktionscontainer mit Node 22 |
| `deploy/docker-compose.yml` | Lokale Zusammensetzung von Anwendung und MySQL 8 |
| `deploy/env.example.md` | Bisherige Vorlage für die Betriebsvariablen; wird im Übergabepaket zu einer `.env.example` ergänzt |

Die wichtigsten direkten Laufzeitgruppen sind React und die Benutzeroberfläche (`react`, `react-dom`, Radix UI, Tailwind), Server und API (`express`, `@trpc/*`, `zod`), Datenbank (`drizzle-orm`, `mysql2`), Anmeldung und Sicherheit (`bcryptjs`, `jose`, `otpauth`, `@node-saml/node-saml`, `helmet`, `express-rate-limit`), Dateispeicher (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `multer`), E-Mail (`nodemailer`) und Hintergrundjobs (`node-cron`).

## 3. Datenbank

Die Datenbank enthält derzeit **49 Basistabellen**. Der Datenbestand ist klein; die bisher geprüften Kernwerte zeigen beispielsweise 60 Migrationsstände, 258 Audit-Einträge, 317 Kommissionspräferenzen, 15 Prüfer:innen-Fachbereichszuordnungen und 8 allgemeine E-Mail-Vorlagen. Die endgültigen Größen, Zeilenzahlen und Inhalte müssen aus einem konsistenten SQL-Dump abgeleitet werden, nicht aus diesen Näherungswerten.

| Fachbereich im Datenmodell | Tabellen |
|---|---|
| Nutzer, Rollen und Sicherheit | `users`, `user_roles`, `login_attempts`, `password_reset_tokens`, `two_factor_recovery_codes`, `two_factor_reminder_emails`, `notification_preferences`, `magic_links` (Altdaten), `student_registration_invitations` |
| Thesis und Prüfungsprozess | `thesis_requests`, `thesis_doc_tokens`, `audit_log`, `notifications`, `deadline_changes`, `programme_semester_deadlines`, `admin_decision_log`, `pav_examiner_proposals`, `reminder_schedules`, `reminder_templates`, `saved_filters` |
| Prüfer:innen und Kapazitäten | `examiner_profiles`, `examiner_departments`, `examiner_programmes`, `examiner_semester_capacities`, `examiner_commission_preferences`, `examiner_action_tokens`, `examiner_email_templates`, `examiner_topics`, `examiner_favorites`, `examiner_comments`, `examiner_seen_notifications` |
| Kolloquium | `colloquiums`, `colloquium_room_blocks`, `colloquium_scheduling_polls`, `colloquium_scheduling_participants`, `colloquium_scheduling_slots`, `colloquium_scheduling_responses` |
| Dokumente und Öffentlichkeit | `conditional_documents`, `conditional_document_comments`, `published_thesis_abstracts`, `faq_feedback`, `faq_rating_totals`, `guide_download_totals` |
| Stammdaten und Administration | `programmes`, `admin_departments`, `pav_programmes`, `email_templates`, `system_settings`, `__drizzle_migrations` |

Die zentralen Beziehungen sind eindeutig: `thesis_requests` verbindet Studierende, Erstprüfer:innen und Zweitprüfer:innen; Kolloquiumsabstimmungen hängen an einem Thesis-Fall; Prüfer:innenprofile, Rollen, Fachbereiche, Programme und Kapazitäten hängen an `users`; private Dokumente hängen am Thesis-Fall und ihren hochladenden Personen. Die vollständige Spalten- und Fremdschlüsseldefinition liegt in `drizzle/schema.ts` und wird im späteren Übergabepaket zusätzlich als SQL-Schema ausgegeben.

> **Wichtiger Befund:** Das reale Datenbankschema nutzt teilweise ältere beziehungsweise gemischte Spaltenbezeichnungen (zum Beispiel `avatarKey` neben `banner_image_key`). Das ist kein akuter Fehler, aber ein Migrationsrisiko. Für den Umzug ist ein SQL-Dump der **tatsächlichen produktiven Datenbank** zwingend. Automatisch aus dem Code erzeugte Migrationen dürfen erst nach dem Import und einem Schemaprüfungslauf ausgeführt werden.

## 4. Dateien und Dateispeicher

Die Anwendung referenziert Dateien in Nutzerprofilen, Exposés, vertraulichen Zusatzdokumenten, Bannern und PDF-Leitfäden. Im Projektordner selbst befinden sich keine produktiven Uploads. Es gibt 85 bereitgestellte statische Arbeitsdateien außerhalb des Projektordners mit rund 8,1 MB. Der produktive Speicheradapter wählt beim Start automatisch einen Modus.

| Speichermodus | Aktivierung | Zweck | Umzugsbewertung |
|---|---|---|---|
| Plattform-Speicher | Beide `BUILT_IN_FORGE_API_*`-Variablen gesetzt | bisheriger Speicherbetrieb | muss ersetzt beziehungsweise vollständig exportiert werden |
| S3-kompatibler Speicher | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` gesetzt | IONOS S3 oder Hetzner Object Storage | für Produktion empfohlen |
| Lokales Dateisystem | kein anderer Speichermodus aktiv | Dateien unter `STORAGE_LOCAL_DIR`, Standard `storage-data` | möglich, aber nur mit serverseitigem Backup |

**Offener Punkt:** Die Anzahl und Gesamtgröße der aktuell im Plattform-Speicher liegenden privaten Dateien kann nicht verlässlich aus dem lokalen Projektordner abgelesen werden. Der Übergabeschritt muss daher einen autorisierten Export aller referenzierten Objekte durchführen oder einen vollständigen Plattform-Datensicherungsstand einschließen.

## 5. Anmeldung, Personen- und Sicherheitsdaten

Die Anwendung verwendet lokale E-Mail-/Passwort-Anmeldung. Passwörter werden als Hash gespeichert, nicht im Klartext. Zusätzlich gibt es optionale TOTP-Zwei-Faktor-Authentifizierung mit einmaligen Wiederherstellungscodes. SAML 2.0 ist nur vorbereitet und standardmäßig deaktiviert; die Konfiguration liegt als Werte in `system_settings`.

| Verfahren | Zustand | Für unabhängigen Betrieb erforderlich |
|---|---|---|
| E-Mail und Passwort | aktiv | `JWT_SECRET`, MySQL, SMTP für Reset-E-Mails |
| Rollenfreigabe | aktiv | MySQL und SMTP |
| TOTP-2FA | aktivierbar | `TWO_FACTOR_ENCRYPTION_KEY` |
| SAML 2.0 | vorbereitet, deaktiviert | HTW-Berlin-IdP-Metadaten, Zertifikat, feste HTTPS-Domain; erst nach Test aktivieren |

Die Datenbank enthält personenbezogene Daten wie Name, E-Mail-Adresse, Rollen, Fachbereich, Matrikelnummer, Profile, Protokolle, Passwort-Hashes und gegebenenfalls 2FA-Geheimnisse. Der Export ist deshalb nur verschlüsselt zu speichern und darf nicht in E-Mail-Anhängen, öffentlichen Cloud-Links oder Git-Repositories landen.

## 6. Externe Dienste und Plattformbindungen

| Dienst | Aktueller Zweck | Unabhängiger Ersatz | Priorität |
|---|---|---|---|
| Plattform-Speicher / Forge | Dateiuploads und bisherige gespeicherte Assets | IONOS S3, Hetzner Object Storage oder lokales Volume | zwingend |
| Plattform-Heartbeat | geplante Erinnerungen | bereits vorhandener `node-cron`-Scheduler | zwingend aktivieren |
| Plattform-Owner-Benachrichtigung | optionaler Hinweis an Projekteigentümer | SMTP oder weglassen; kein Kernprozess | prüfen |
| Plattform-OAuth-Routen | Legacy-/Kompatibilitätscode | lokale Passwort-Anmeldung ist bereits primär; OAuth-Routen vor externem Betrieb entfernen oder sauber deaktivieren | empfohlen |
| SMTP | E-Mails an Personen | eigener SMTP-Anbieter oder Hochschul-SMTP | zwingend |
| SAML-IdP der HTW Berlin | optionale föderierte Anmeldung | kann unverändert mit eigener Domain betrieben werden | optional |

Es wurden keine aktiven Fachmodule gefunden, die einen integrierten KI-, Karten- oder allgemeinen Daten-API-Dienst direkt verwenden. Diese Pakete oder Hilfsdateien können dennoch im Quellcode vorhanden sein und werden vor dem endgültigen Paket gesondert auf aktive Imports geprüft.

## 7. Hintergrundprozesse und Webschnittstellen

Im unabhängigen Betrieb startet `server/scheduler.ts` zwei tägliche Aufgaben um 08:00 UTC. Sie versenden Erinnerungen für offene Kolloquiumsabstimmungen und überfällige verpflichtende 2FA-Einrichtungen. Der Scheduler wird nur mit `SCHEDULER_ENABLED=true` aktiv. Die internen Endpunkte werden mit `CRON_SECRET` geschützt.

> **Sicherheitsanforderung:** `CRON_SECRET` muss gesetzt werden. Andernfalls warnt der Code zwar, die Hintergrundendpunkte würden jedoch ohne den lokalen Schlüssel aufgerufen. Die Übergabeanleitung wird diesen Start ohne Geheimnis als Fehlerzustand behandeln.

## 8. Erforderliche Umgebungsvariablen

| Variable | Zweck | Externer Betrieb |
|---|---|---|
| `DATABASE_URL` | vollständige MySQL-Verbindungszeichenfolge | zwingend |
| `JWT_SECRET` | Sitzungs- und Token-Schutz | zwingend, neu erzeugen |
| `CRON_SECRET` | Schutz der lokalen Hintergrundjobs | zwingend, neu erzeugen |
| `TWO_FACTOR_ENCRYPTION_KEY` | Verschlüsselung von 2FA-Geheimnissen | zwingend, sicher übernehmen oder 2FA-Neueinrichtung planen |
| `SITE_URL` | öffentliche Basisadresse für E-Mails und Links | zwingend |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | E-Mail-Versand | zwingend |
| `STORAGE_LOCAL_DIR` | lokaler Dateispeicher | erforderlich, wenn kein S3 genutzt wird |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | IONOS- oder Hetzner-Objektspeicher | erforderlich, wenn S3 genutzt wird |
| `SCHEDULER_ENABLED` | Aktivierung der lokalen Aufgaben | auf dem Zielserver `true` |
| `PORT`, `NODE_ENV` | Serverbetrieb | üblich: 3000 und `production` |
| `APP_ORIGIN`, `FRONTEND_URL`, `PUBLIC_APP_URL` | einzelne URL-Fallbacks | auf eine einzige Zieladresse vereinheitlichen |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Plattform-/Legacy-Funktionen | für eigenständigen Betrieb nicht verwenden; erst nach Codebereinigung entfernen |

## 9. Domains, DNS und Zertifikate

Derzeit sind `thesis.htw-berlin.com`, `thesismatch.manus.space` und `thesismatch-s6sj5g57.manus.space` bekannt. Für den unabhängigen Betrieb ist nur die selbst verwaltete Domain `thesis.htw-berlin.com` relevant. Die genauen aktuellen DNS-Einträge, der Registrar und die Zertifikatsverwaltung konnten aus dem Projektordner nicht ausgelesen werden.

| Thema | Zustand | Erforderliche Klärung |
|---|---|---|
| Hauptdomain | `thesis.htw-berlin.com` | Wer verwaltet die DNS-Zone und wer darf Einträge ändern? |
| HTTPS-Zertifikat | derzeit plattformverwaltet | Zielbetrieb über Caddy oder Nginx mit Let's Encrypt einrichten |
| Subdomains | Plattformadressen vorhanden | nicht in den unabhängigen Betrieb übernehmen |
| DNS-Umstellung | noch nicht erfolgt | erst nach Test unter einer separaten Testdomain oder Test-IP |

## 10. Offene Punkte und Migrationsstopps

| Offener Punkt | Warum er wichtig ist | Nächster sicherer Schritt |
|---|---|---|
| Vollständiger SQL-Dump der Live-Daten | Code und Datenbank weichen in Details voneinander ab | Export aus der echten Datenbank vor jeder Migration |
| Vollständiger Export des Plattform-Dateispeichers | Private Uploads liegen nicht im Projektordner | autorisierten Objekt- oder Task-Datenexport erstellen |
| DNS-Registrar und Zugang | Domainumschaltung ist ohne diese Information nicht möglich | bei IT/DNS-Verwaltung erfragen |
| SMTP-Anbieter und Zugang | Status- und Freigabe-E-Mails sind Kernfunktion | Hochschul-SMTP oder transaktionalen EU-Anbieter festlegen |
| 2FA-Verschlüsselungsschlüssel | Verlust macht vorhandene TOTP-Geheimnisse unlesbar | sicher übernehmen oder kontrollierte Neueinrichtung planen |
| SAML-Entscheidung | keine Voraussetzung für den Umzug | deaktiviert lassen, bis die HTW Berlin alle IdP-Angaben liefert |
| Reverse Proxy | Docker Compose enthält noch keinen Caddy/Nginx-Dienst | im Übergabepaket vollständig ergänzen und testen |

## Zwischenfazit

Die Anwendung ist **grundsätzlich auf einen unabhängigen Betrieb vorbereitbar**. Der vorhandene Containerbetrieb, der lokale Scheduler, der SMTP-Versand und der S3-kompatible Speicheradapter sind dafür eine gute Grundlage. Der sichere Umzug ist jedoch erst nach einem vollständigen Daten- und Dateiexport sowie nach einer Schemaabgleichprüfung verantwortbar. Das nächste Arbeitsergebnis ist daher kein vorschnelles Paket, sondern ein validierter Export- und Übergabeplan auf Basis dieser Inventarliste.
