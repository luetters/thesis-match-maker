# Thesis-Management HTW Berlin – TODO

## Datenbankschema
- [x] Drizzle-Schema: users-Tabelle mit Rollen (student, examiner, admin)
- [x] Drizzle-Schema: thesisRequests-Tabelle mit Status-Enum (PENDING, ACCEPTED, REJECTED, MATCHED)
- [x] Drizzle-Schema: auditLog-Tabelle für alle Statusänderungen
- [x] Drizzle-Schema: examiners-Profiltabelle (Tags, Sprachen, Studiengang)
- [x] Drizzle-Schema: notifications-Tabelle (userId, title, message, read, thesisRequestId)
- [x] DB-Migration pushen (pnpm db:push)

## Backend / tRPC-Routers
- [x] server/db.ts: Query-Helfer für thesisRequests, auditLog, examiners
- [x] router: thesis.create (Student reicht Anfrage ein)
- [x] router: thesis.list (gefiltert nach Rolle)
- [x] router: thesis.updateStatus (Admin ändert Status + AuditLog-Eintrag + Benachrichtigung)
- [x] router: thesis.assignExaminer (Admin weist Prüfer zu + JWT-E-Mail + Benachrichtigung)
- [x] router: thesis.examinerRespond (Prüfer:in nimmt an/lehnt ab)
- [x] router: examiner.list (öffentliche Prüfer-Profile)
- [x] router: examiner.respondViaToken (JWT-gesicherter Login-freier Endpunkt)
- [x] router: auditLog.all (Admin-only)
- [x] JWT-Helfer: signExaminerActionToken / verifyExaminerActionToken für E-Mail-CTAs
- [x] router: admin.users, admin.updateUserRole
- [x] router: notifications.list, notifications.unreadCount, notifications.markRead, notifications.markAllRead
- [x] Nodemailer-Helfer: server/emailHelper.ts mit SMTP-Konfiguration
- [x] SMTP-Secrets via webdev_request_secrets (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [x] Automatischer CTA-E-Mail-Versand bei thesis.assignExaminer (JWT-Link an Prüfer:in)
- [x] Automatischer Status-E-Mail-Versand bei thesis.updateStatus
- [x] Upload-Route: /api/upload/expose/:thesisId (Multer + S3-Ablage)

## Frontend
- [x] HTW-Design-System: CSS-Variablen (Grün #006937 / oklch, Navy, Gold)
- [x] ThesisDashboardLayout mit barrierefreier Sidebar-Navigation (alle Rollen)
- [x] Benachrichtigungs-Glocke mit Unread-Badge und Dropdown-Panel in Header
- [x] Rollen-basiertes Routing in App.tsx
- [x] Studenten-Dashboard: eigene Anfragen, Status-Badges, neue Anfrage einreichen, Prüfer-Suche
- [x] Studenten-Dashboard: Exposé-Upload-Button (PDF, max. 16 MB) pro Anfrage
- [x] Prüfer-Dashboard: offene Anfragen, annehmen/ablehnen, Profil-Bearbeitung
- [x] Admin-Dashboard: alle Anfragen, Prüfer-Zuweisung, AuditLog-Ansicht, Nutzerverwaltung
- [x] JWT-CTA-Seite: /examiner/respond?token=... (Login-frei)
- [x] Formular: ThesisRequest einreichen (Titel, Beschreibung, Fachbereich, Semester, Sprache, Abschlussart)
- [x] Status-Badges (PENDING/ACCEPTED/REJECTED/MATCHED) mit Farb-Codierung
- [x] Landing Page mit Hero, Drei-Perspektiven-Sektion, Ablauf-Sektion, Footer

## Tests
- [x] Vitest: thesis.create Prozedur (inkl. Rollen-Guards)
- [x] Vitest: examiner.respondViaToken JWT-Validierung
- [x] Vitest: auditLog-Eintrag bei Statusänderung
- [x] Vitest: admin-only Prozeduren (Rollen-Guards)
- [x] Vitest: auth.logout Cookie-Clearing
- [x] Vitest: emailHelper SMTP-Konfigurationstest
- [x] Vitest: jwtHelper Token-Signierung und -Verifikation
- [x] Vitest: notifications Mock-Tests

## Phase 3: Auth-Umbau & Admin-Verwaltung

- [x] Eigenes Auth-System: Magic-Link per SMTP ohne Manus-Account
- [x] DB-Tabelle magic_links (token, email, expiresAt, used)
- [x] POST /api/auth/magic-link – E-Mail mit Token versenden
- [x] GET /api/auth/verify?token=... – Token validieren, Session setzen
- [x] Login-Seite mit E-Mail-Eingabe (kein OAuth)
- [x] Admin-Dashboard: Prüfer anlegen (Name, E-Mail, Fachbereich, Titel)
- [x] Admin-Dashboard: Prüfer bearbeiten und deaktivieren
- [x] Admin-Dashboard: Nutzer-Rollen ändern (student/examiner/admin)
- [x] Admin-Dashboard: Nutzer per E-Mail einladen
- [x] Landing Page: HTW-Hintergrundbild /manus-storage/htw-banner_ee222f9c.jpg
- [x] Landing Page: Titel "Thesis Match Maker" und Untertitel aktualisieren
- [x] Landing Page: HTW-Farben #76b900 durchgängig anwenden

## Phase 5: Profilseiten, Kolloquium & SMTP

- [x] SMTP-Verbindungstest-Button im Admin-Dashboard
- [x] SMTP-Secrets über webdev_request_secrets einrichten
- [x] Öffentliche Prüfer:innen-Profilseite /examiner/:id
- [x] Foto-Upload für Prüfer:innen-Profil (S3)
- [x] Betreuungskapazität-Anzeige (aktuell / maximal)
- [x] DB-Tabelle colloquiums (Termin, Ort, Thesis-Bezug, Teilnehmer)
- [x] Admin-UI: Kolloquiumstermin anlegen und bearbeiten
- [x] ICS-Einladung für Kolloquiumstermin (Studierende + Prüfer:innen)
- [x] Kolloquiums-Übersicht im Admin-Dashboard
- [x] Benachrichtigungen bei Kolloquiums-Termin-Erstellung

## Phase 6: Dashboards, Verzeichnis, Zeitstrahl

- [x] Kolloquiums-Termine im Studierenden-Dashboard (Tab "Mein Kolloquium")
- [x] Kolloquiums-Termine im Prüfer:innen-Dashboard (Tab "Kolloquien")
- [x] ICS-Download-Button pro Kolloquiumstermin in beiden Dashboards
- [x] Öffentliches Prüfer:innen-Verzeichnis /examiners mit Suchfeld
- [x] Profilkarten mit Foto, Titel, Fachbereich, Kapazität und Profil-Link
- [x] Filterung nach Fachbereich im Verzeichnis
- [x] Statushistorie-Tab in Thesis-Detailansicht (Studierenden-Dashboard)
- [x] Zeitstrahl-Visualisierung der AuditLog-Einträge pro Anfrage
- [x] tRPC-Prozedur: colloquium.byThesis (Kolloquien einer Anfrage)
- [x] tRPC-Prozedur: thesis.auditHistory (AuditLog einer Anfrage)

## Phase 7: Statistiken, i18n und Exposé-Vorschau

- [x] Admin-Statistik-Dashboard: Anfragen pro Status (Donut-Chart), pro Fachbereich (Balken), pro Monat (Linie)
- [x] tRPC-Prozedur: admin.stats (aggregierte Kennzahlen)
- [x] Recharts-Diagramme im Admin-Dashboard (neuer Tab "Statistiken")
- [x] Mehrsprachigkeit DE/EN: i18n-Kontext mit useTranslation-Hook
- [x] Sprachumschalter (DE/EN) in der Navbar der Landing Page und in allen Dashboards
- [x] Übersetzungen für Landing Page, Studierenden-Dashboard und Prüfer:innen-Dashboard
- [x] PDF-Vorschau-Modal im Prüfer:innen-Dashboard (iframe + Download-Button)
- [x] Exposé-Link in der Anfragen-Übersicht des Prüfer:innen-Dashboards hervorheben

## Phase 7: Statistiken, i18n und Expose-Vorschau

- [x] Admin-Statistik-Dashboard: Anfragen pro Status (Donut-Chart), pro Fachbereich (Balken), pro Monat (Linie)
- [x] tRPC-Prozedur: admin.stats (aggregierte Kennzahlen)
- [x] Recharts-Diagramme im Admin-Dashboard (neuer Tab Statistiken)
- [x] Mehrsprachigkeit DE/EN: i18n-Kontext mit useTranslation-Hook
- [x] Sprachumschalter (DE/EN) in der Navbar der Landing Page und in allen Dashboards
- [x] Uebersetzungen fuer Landing Page, Studierenden-Dashboard und Pruefer-Dashboard
- [x] PDF-Vorschau-Modal im Pruefer-Dashboard (iframe + Download-Button)
- [x] Expose-Link in der Anfragen-Uebersicht des Pruefer-Dashboards hervorheben

## Phase 8: Testkonten & Passwort-Login
- [x] bcrypt-Abhängigkeit installieren
- [x] DB-Schema: passwordHash-Spalte in users-Tabelle ergänzen
- [x] Backend: auth.loginWithPassword tRPC-Prozedur (E-Mail + Passwort → Session)
- [x] Login-UI: Passwort-Feld im Magic-Link-Modal ergänzen (Tab-Umschalter)
- [x] Seed-Skript: 5 Testkonten anlegen (Superadmin, Student, Erstprüfer, Zweitprüfer, Verwaltung)
- [x] Superadmin Holger@Luetters.net mit Rolle "admin" anlegen
- [x] Student Student@Htw-berlin.com mit Rolle "student" anlegen
- [x] Erstprüfer Firstsupervisor@htw-berlin.com mit Rolle "examiner" anlegen
- [x] Zweitprüfer SecondSupervisor@htw-berlin.com mit Rolle "examiner" anlegen
- [x] Verwaltung Verwaltung@htw-berlin.com mit Rolle "admin" anlegen
- [x] Passwort "Borschtsch05" für alle 5 Konten setzen

## Phase 9: Passwort-Ändern, Superadmin-Bereich, Deployment
- [x] Backend: auth.changePassword tRPC-Prozedur (altes PW prüfen, neues setzen)
- [x] Profil-UI: Passwort-ändern-Dialog im Dashboard-Header/Profil
- [x] Superadmin-Dashboard: eigener Tab "Superadmin" mit Systemkonfiguration
- [x] Superadmin: Rollen-Vergabe für alle Nutzer:innen (inkl. superadmin-Rolle)
- [x] Superadmin: Audit-Log-Export als CSV
- [x] Superadmin: Systemstatistiken (Gesamtübersicht aller Rollen/Aktivitäten)

## Phase 9b: Superadmin-Sicherheit & Systemkonfiguration
- [x] Backend: superadminProcedure einführen – nur Superadmins dürfen Rolle "superadmin" vergeben
- [x] Backend: updateUserRole absichern – Vergabe von "superadmin" nur durch superadminProcedure erlaubt
- [x] Superadmin-Dashboard: Systemkonfigurations-Tab mit persistierten Einstellungen (z.B. Systemname, Kontakt-E-Mail, Wartungsmodus)

## Phase 10: Logo, Favicon und drei Vorschläge
- [x] Icon als Favicon (32x32, 16x16 ICO) aufbereiten
- [x] Icon als App-Logo (512x512 PNG) hochladen und in Webdev-Secrets setzen
- [x] Favicon in index.html einbinden
- [x] i18n vertiefen: useLanguage-Hook in StudentDashboard, ExaminerDashboard, AdminDashboard einsetzen
- [x] PDF-Vorschau-Modal im Prüfer:innen-Dashboard (iframe-basiert)
- [x] Superadmin: Systemkonfigurations-Tab mit persistierten Einstellungen (Systemname, Kontakt-E-Mail, Wartungsmodus)

## Phase 11: Wartungsmodus & Passwort-Reset
- [x] Backend: Wartungsmodus-Middleware (systemSettings lesen, Nicht-Superadmins blockieren)
- [x] Frontend: /maintenance Hinweisseite (HTW-Design, Kontakt-E-Mail aus Systemkonfiguration)
- [x] Frontend: App.tsx prüft Wartungsmodus und leitet um
- [x] DB-Schema: passwordResetTokens-Tabelle (token, userId, expiresAt, used)
- [x] Backend: auth.requestPasswordReset (E-Mail eingeben → Reset-Link versenden)
- [x] Backend: auth.resetPassword (Token validieren → neues Passwort setzen)
- [x] E-Mail: Reset-Link-E-Mail mit HTW-Branding
- [x] Frontend: "Passwort vergessen"-Link im Login-Modal
- [x] Frontend: /reset-password?token=... Seite (neues Passwort eingeben)
- [x] Vitest: Passwort-Reset-Prozeduren testen (35/35 Tests grün)

## Phase 12: HTW-Berlin-CI Landing Page
- [x] Hero-Hintergrund: dunkelgrün entfernen, helles/neutrales HTW-CI-Design
- [x] Foto-Darstellung: ohne grünen Farbüberlagerung zeigen
- [x] T-Platzhalter-Logo durch echtes App-Icon ersetzen (alle Stellen inkl. E-Mail-Template)

## Phase 13: Studiengänge & Piktogramme
- [x] HTW-Piktogramme von corporatedesign.htw-berlin.de herunterladen (alle 23 Studiengänge)
- [x] Piktogramme in Webdev-Storage hochladen und URL-Mapping erstellen
- [x] DB-Schema: programmes-Tabelle (id, name, abbreviation, level: bachelor/master, pictogramUrl)
- [x] DB-Schema: studentProfile.programmeId (FK, nicht änderbar nach Erstanlage)
- [x] DB-Schema: examinerProgrammes-Tabelle (examiner kann mehrere Studiengänge wählen)
- [x] DB-Migration pushen
- [x] Backend: programmes.list (öffentlich, alle Studiengänge mit Piktogramm)
- [x] Backend: student.setProgramme (einmalig setzbar, danach readonly)
- [x] Backend: examiner.setProgrammes (mehrere Studiengänge auswählen)
- [x] Frontend: Studiengang-Auswahl beim Onboarding (Student, Dropdown mit Piktogramm)
- [x] Frontend: Studiengang-Anzeige im Studierenden-Dashboard (readonly)
- [x] Frontend: Prüfer-Einstellungen: Studiengänge auswählen (Mehrfachauswahl mit Piktogrammen)
- [x] Frontend: Studiengang-Badge in Betreuungsanfragen anzeigen

## Phase 14: Studiengang vorausfüllen, Verzeichnis-Filter, Login-Validierung, Alternative E-Mail

- [x] Studiengang im Antragsformular automatisch vorausfüllen (aus Studierenden-Profil)
- [x] Studiengang-Filter-Dropdown im Prüfer:innen-Verzeichnis (nach Studiengang filtern)
- [x] Prüfer:innen-Verzeichnis hinter Login sperren (nur eingeloggte Nutzer:innen)
- [x] Backend: HTW-E-Mail-Validierung beim Passwort-Login (@htw-berlin.de Pflicht für Studierende und Erstprüfer:innen)
- [x] Backend: Zweitprüfer:innen dürfen auch andere E-Mail-Adressen verwenden
- [x] DB-Schema: alternativeEmail-Feld in examinerProfiles-Tabelle
- [x] Frontend: Alternative E-Mail-Adresse im Prüfer:innen-Profil (editierbar)
- [x] Backend: auth.loginWithPassword prüft E-Mail-Domain je nach Rolle

## Phase 15: isSecondExaminer-Flag & Alternative E-Mail-Versand

- [x] DB-Schema: isSecondExaminer-Flag (boolean) in examinerProfiles-Tabelle
- [x] DB-Migration: ALTER TABLE examiner_profiles ADD COLUMN isSecondExaminer
- [x] Backend: examiner.setSecondExaminerFlag tRPC-Prozedur (examinerProcedure)
- [x] Backend: loginWithPassword – Erstprüfer:innen (isSecondExaminer=false) müssen @htw-berlin.de verwenden; Zweitprüfer:innen dürfen externe E-Mails nutzen
- [x] Frontend: isSecondExaminer-Toggle im Prüfer:innen-Profil (mit Erklärungstext)
- [x] Backend: emailHelper – bei Prüfer:innen mit alternativeEmail diese für CTA und Statusbenachrichtigungen verwenden
- [x] Backend: thesis.assignExaminer – CTA-E-Mail an alternativeEmail senden wenn vorhanden
- [x] Backend: thesis.updateStatus – Statusbenachrichtigung an alternativeEmail senden wenn vorhanden

## Phase 15b: Lücken aus Gap-Analyse

- [x] Admin-UI: isSecondExaminer-Flag für Prüfer:innen direkt im Admin-Dashboard setzen (ohne Login der Prüfer:in)
- [x] db.ts: Hilfsfunktion resolveExaminerEmail(userId) zentralisieren (alternativeEmail bevorzugen)
- [x] routers.ts: assignExaminer und updateStatus nutzen resolveExaminerEmail statt inline-Logik
- [x] setSecondExaminerFlag: Admin kann userId übergeben, Prüfer:in setzt eigenes Flag

## Phase 16: Onboarding-Modal & Verzeichnis-Badges

- [x] Backend: examiner.hasCompletedOnboarding tRPC-Prozedur (prüft ob isSecondExaminer gesetzt wurde)
- [x] Frontend: ExaminerOnboardingModal-Komponente (Erst-/Zweitprüfer:in-Auswahl + optionale alternative E-Mail)
- [x] Frontend: ExaminerDashboard zeigt Modal beim ersten Login (wenn kein Profil vorhanden oder onboarding nicht abgeschlossen)
- [x] Frontend: Erst-/Zweitprüfer:in-Badge auf Profilkarten im Prüfer:innen-Verzeichnis (/examiners)
- [x] Frontend: Badge auch auf öffentlicher Profilseite /examiner/:id anzeigen

## Phase 16b: Lücken aus Gap-Analyse

- [x] DB-Schema: onboardingCompleted-Flag in examinerProfiles (statt isSecondExaminer-Default-Heuristik)
- [x] Backend: examiner.completeOnboarding tRPC-Prozedur (setzt isSecondExaminer + alternativeEmail + onboardingCompleted in einem Schritt)
- [x] Frontend: ExaminerDashboard prüft onboardingCompleted statt isSecondExaminer-Null-Heuristik
- [x] Frontend: Öffentliche Profilseite /examiner/:id um Erst-/Zweitprüfer:in-Badge erweitern (grün für Erstprüfer:in, blau für Zweitprüfer:in)

## Phase 17: PAV-Rolle, Dekanat-Rollen, Rollenfilter, Onboarding-Reset

### 17a – Verzeichnis & Onboarding
- [x] Frontend: Rollenfilter (Erstprüfer:in / Zweitprüfer:in / Alle) im Prüfer:innen-Verzeichnis
- [x] Frontend: Admin-Dashboard – Onboarding-Reset-Schaltfläche für Prüfer:innen

### 17b – DB-Schema & Migration
- [x] DB-Schema: Rollen-Enum erweitern um pav, dean, vice_dean
- [x] DB-Schema: pav_programmes-Tabelle (PAV ↔ Studiengang many-to-many)
- [x] DB-Schema: pav_examiner_proposals-Tabelle (PAV-Vorschläge mit Status pending/accepted/declined)
- [x] DB-Schema: thesisRequests – hasOwnTopic (boolean) Feld hinzufügen
- [x] DB-Migration: ALTER TABLE + neue Tabellen anlegen

### 17c – Backend PAV
- [x] Backend: pav.getUnassignedStudents – Liste Studierende ohne Erst- oder Zweitprüfer:in
- [x] Backend: pav.proposeExaminer – Vorschlag (max. 3 offene Anfragen gleichzeitig) + E-Mail an Prüfer:in
- [x] Backend: pav.getProposals – eigene Vorschläge mit Status einsehen
- [x] Backend: pav.respondToProposal – Prüfer:in nimmt an oder lehnt ab (per Token-Link)
- [x] Backend: E-Mail-Vorlage für PAV-Vorschlag (CTA: Annehmen / Ablehnen)

### 17d – Backend Dekanat & SuperAdmin
- [x] Backend: dean/vice_dean können alle Thesis-Requests lesen (deanProcedure)
- [x] Backend: superadmin.setUserRole – SuperAdmin weist alle Rollen zu (inkl. dean/vice_dean/pav)
- [x] Backend: superadmin.listAllUsers – alle Nutzer:innen mit Rollen einsehen

### 17e – Frontend PAV
- [x] Frontend: PAV-Dashboard (Route /pav) mit Tab „Unzugeteilte Studierende“
- [x] Frontend: PAV-Dashboard Tab „Meine Vorschläge“ (Status-Übersicht)
- [x] Frontend: Vorschlag-Dialog (Prüfer:in auswählen, Erst-/Zweitprüfer:in-Typ, Absenden)

### 17f – Frontend Dekanat
- [x] Frontend: Dekanat-Dashboard (Route /dean) – Lesezugriff auf alle Anträge mit Statistik
- [x] Frontend: Admin-Dashboard – erweiterte Rollenliste (pav, dean, vice_dean)

### 17g – Studierenden-Thema-Option
- [x] Frontend: Antragsformular – Toggle „Ich habe ein eigenes Thema“ / „Kein eigenes Thema“
- [x] Frontend: Wenn kein eigenes Thema → Titel optional, Platzhaltertext angepasst
- [x] Backend: hasOwnTopic im createThesisRequest speichern und in Übersichten anzeigen

## Phase 18: PAV-Studiengang-Zuordnung, CSV-Export Dekanat

### 18a – PAV-Studiengang-Zuordnung
- [x] Backend: pav.addProgramme / pav.removeProgramme Prozeduren
- [x] Backend: pav.getProgrammes – eigene Studiengänge abrufen
- [x] Backend: pav.getUnassignedStudentsFiltered – nach PAV-Studiengängen filtern
- [x] Frontend: PAV-Dashboard Tab „Meine Studiengänge“ – Studiengänge zuordnen/entfernen
- [x] Frontend: PAV-Dashboard Tab „Unzugeteilte Studierende“ – nur Studierende der eigenen Studiengänge

### 18b – CSV-Export Dekanat
- [x] Backend: dean.exportCsv – alle Anträge als CSV (tRPC-Query)
- [x] Frontend: Dekanat-Dashboard – „CSV-Export“-Schaltfläche mit Download-Trigger im Header

## Phase 19: Superadmin PAV-Zuweisung, Dekanat-Detailansicht, Deployment

### 19a – Superadmin PAV-Studiengang-Zuweisung
- [x] Backend: superadmin.getPavUsers – alle PAV-Nutzer:innen mit ihren Studiengängen
- [x] Backend: superadmin.assignPavProgramme – Superadmin weist PAV einem Studiengang zu
- [x] Backend: superadmin.removePavProgramme – Zuweisung entfernen
- [x] Frontend: Superadmin-Panel – neuer Tab "PAV-Verwaltung" mit Nutzer/Studiengang-Matrix

### 19b – Dekanat-Dashboard Detailansicht
- [x] Backend: dean.getRequestDetail – Antrag mit Prüfer:innen, Statushistorie, Kolloquiumstermin
- [x] Frontend: DeanDashboard – Klick auf Zeile öffnet Seitenleiste
- [x] Frontend: Seitenleiste zeigt Antragstitel, Studierende, Prüfer:innen, Statushistorie, Kolloquium, Metadaten

### 19c – Deployment
- [x] Checkpoint erstellt
- [x] Nutzer:in über Publish-Button informiert

## Phase 20: PAV-Benachrichtigung, gefilterter CSV-Export, Rollenwechsel-Dialog

- [x] Backend: sendPavProgrammeAssignmentEmail in emailHelper.ts (Zuweisung und Entfernung)
- [x] Backend: superadmin.assignPavProgramme und removePavProgramme senden E-Mail an PAV
- [x] Backend: dean.exportCsv mit optionalen Filterparametern (status, search)
- [x] Frontend: DeanDashboard – CSV-Export übergibt aktuelle Filter (Status + Suchbegriff)
- [x] Frontend: AdminDashboard – RoleChangeConfirmDialog-Komponente mit Warntext
- [x] Frontend: AdminDashboard – Select löst Dialog aus bei kritischen Rollenwechseln (examiner, pav, dean, vice_dean, admin)

## Phase 21: PAV-Direktzuweisung & erweiterter CSV-Export

- [x] Backend: pav.directAssignExaminer – Prüfer:in direkt zuweisen (ohne Rückfrage-E-Mail)
- [x] Frontend: PAV-Dashboard – „Direkt zuweisen“-Button neben „Vorschlag unterbreiten“
- [x] Backend: dean.exportCsv – Spalten „Letzte Statusänderung“ und „Anzahl Statuswechsel“
- [x] Frontend: DeanDashboard – CSV-Export-Button bleibt unverändert (Backend liefert neue Spalten automatisch)

## Design-Fix & Kontaktdaten
- [x] Home.tsx: Kontaktdaten aktualisieren (thesis@htw-berlin.com, Treskowallee 8 10318 Berlin, www.htw-berlin.com)
- [x] Home.tsx: Farben im unteren Bereich (CTA, Footer) an oberen Bereich angleichen (HTW-Grün #006937, #76B900)
- [x] Systemkonfiguration: contactEmail auf thesis@htw-berlin.com setzen

## Icons & Design-Fix
- [x] Icons hochladen (IconFemaleFemale, IconMaleMale, Iconallgender) als webdev-static-assets
- [x] Favicon: IconFemaleFemale als favicon.ico setzen
- [x] Landing-Page: Icons an passenden Stellen einbinden (Hero, Karten, Navigation)
- [x] Home.tsx: Kontaktdaten aktualisieren (thesis@htw-berlin.com, Treskowallee 8 10318 Berlin, www.htw-berlin.com)
- [x] Home.tsx: Farben im unteren Bereich (Technischer Rahmen, Footer) an oberen Bereich angleichen

## Seed-Daten
- [x] seed-examiners.mjs: 65 Professor:innen (Erstprüfer:innen) und 300 Lehrbeauftragte (Zweitprüfer:innen) angelegt (Passwort: HTWBerlin2024!)

## Phase 22: Onboarding-Assistent, Dekanat-Statistiken, E-Mail-Vorlagen

### Onboarding-Assistent für Prüfer:innen
- [x] Frontend: ExaminerOnboarding.tsx – Schritt-für-Schritt-Assistent (5 Schritte: Willkommen, Profildaten, Foto, Studiengänge, Kapazität & Abschluss)
- [x] Frontend: Schritt 1 – Willkommensseite mit Erklärung der Plattform
- [x] Frontend: Schritt 2 – Profildaten (Titel, Abteilung, Bio, Forschungsschwerpunkt, Bürozeiten, Website)
- [x] Frontend: Schritt 3 – Foto-Upload (optional, S3)
- [x] Frontend: Schritt 4 – Studiengänge auswählen (Mehrfachauswahl mit Piktogrammen)
- [x] Frontend: Schritt 5 – Kapazität (maxSupervisions, isSecondExaminer) + Abschluss-Bestätigung
- [x] Frontend: App.tsx – Weiterleitung zu /examiner/onboarding wenn onboardingCompleted=false
- [x] Backend: examiner.completeOnboarding – onboardingCompleted auf true setzen

### Dekanat-Statistik-Dashboard
- [x] Backend: dean.stats – aggregierte Kennzahlen (Anträge pro Status, pro Studiengang, Bearbeitungszeit, Prüfer:innen-Auslastung)
- [x] Frontend: DeanStats.tsx – eigene Seite /dean/stats mit Recharts-Diagrammen
- [x] Frontend: Donut-Chart: Anträge pro Status
- [x] Frontend: Balken-Chart: Anträge pro Studiengang
- [x] Frontend: Linie-Chart: Anträge pro Monat (letzte 12 Monate)
- [x] Frontend: Tabelle: Top-10 Prüfer:innen nach Auslastung (aktuell/maximal)
- [x] Frontend: KPI-Karten: Gesamtanträge, Ø Bearbeitungszeit, offene Anträge, Abschlussquote
- [x] DeanDashboard: Statistiken-Button neben CSV-Export

### Konfigurierbare E-Mail-Vorlagen
- [x] DB-Schema: email_templates-Tabelle (key, subject, htmlBody, textBody, updatedAt, updatedBy)
- [x] DB-Migration: Tabelle direkt per SQL angelegt
- [x] Seed: 6 Standard-Vorlagen eingefügt (thesis_submitted, examiner_proposal, thesis_accepted, thesis_rejected, colloquium_invitation, status_change)
- [x] Backend: emailTemplates.getAll – alle Vorlagen auflisten (Superadmin)
- [x] Backend: emailTemplates.getByKey – einzelne Vorlage abrufen (Superadmin)
- [x] Backend: emailTemplates.update – Vorlage bearbeiten (subject + htmlBody + textBody)
- [x] Frontend: EmailTemplatesTab.tsx – Vorlagen-Liste mit Bearbeiten-Button
- [x] Frontend: Vorlagen-Editor (Betreff + HTML-Body + Text-Body als Textarea mit Platzhalter-Hinweisen + HTML-Vorschau)
- [x] Frontend: SuperadminDashboard – neuer Tab „E-Mail-Vorlagen“
- [x] 43/43 Tests grün, 0 TypeScript-Fehler

## Phase 23: E-Mail-Versand aus DB-Vorlagen

- [x] emailHelper.ts: loadTemplate(key, vars) – Vorlage aus DB laden, Fallback auf hartkodierten Standard
- [x] emailHelper.ts: replacePlaceholders() – {{platzhalter}} durch Werte ersetzen
- [x] emailHelper.ts: sendExaminerCTAEmail – DB-Vorlage examiner_proposal verwenden
- [x] emailHelper.ts: sendStatusChangeEmail – DB-Vorlage status_change verwenden
- [x] Platzhalter-Ersetzung: {{studentName}}, {{examinerName}}, {{thesisTitle}}, {{actionUrl}} etc.
- [x] Vitest: 3 neue Tests für DB-Vorlagen-Integration (46/46 Tests grün)

## Phase 24: Internationalisierung (DE/EN)

- [x] react-i18next nicht nötig – eigener LanguageContext.tsx mit useLanguage()-Hook
- [x] i18n-Konfiguration: LanguageContext.tsx mit DE/EN-Übersetzungsobjekten
- [x] LanguageProvider in main.tsx eingebunden
- [x] Sprachumschalter (DE/EN-Button in Navbar) funktionsfähig
- [x] Sprache im localStorage persistiert
- [x] Home.tsx: alle Texte durch t.landing.* ersetzt
- [x] Navigation/Navbar: alle Labels durch t.nav.* ersetzt
- [x] DE-subtitle korrigiert (war fälschlicherweise EN)
- [x] StudentDashboard.tsx: t.student.* bereits in früheren Phasen eingebunden
- [x] ExaminerOnboarding.tsx: STEPS-Labels übersetzt
- [x] PavDashboard.tsx: alle Texte durch t.pav.* ersetzt
- [x] DeanDashboard.tsx: alle Texte durch t.dean.* ersetzt
- [x] DeanStats.tsx: Titel, Untertitel, Zurück-Button übersetzt
- [x] SuperadminDashboard.tsx: Tabs und Titel übersetzt
- [x] LanguageSwitcher: DE|EN-Button in Navbar, korrekt mit LanguageProvider verbunden
- [x] 46/46 Tests grün, 0 TypeScript-Fehler

## Phase 25: i18n-Verbesserungen

- [x] ExaminerDashboard.tsx: alle Texte durch t.examiner.* ersetzen
- [x] ExaminerDashboard.tsx: Tabs, Buttons, Fehlermeldungen übersetzen
- [x] DB-Schema: users.preferredLanguage-Spalte (de/en, default: de)
- [x] DB-Migration pushen
- [x] Backend: auth.me gibt preferredLanguage zurück
- [x] Backend: user.setLanguage tRPC-Prozedur (Sprache in DB speichern)
- [x] Frontend: LanguageContext beim Login preferredLanguage aus DB laden
- [x] Frontend: LanguageSwitcher speichert Auswahl auch in DB (wenn eingeloggt)
- [x] LanguageContext.tsx: common.errors-Block mit allen Fehlermeldungen (DE+EN)
- [x] LanguageContext.tsx: common.toasts-Block mit allen Toast-Nachrichten (DE+EN)
- [x] ExaminerDashboard.tsx: Toast-Nachrichten übersetzen
- [x] PavDashboard.tsx: Toast-Nachrichten übersetzen
- [x] DeanDashboard.tsx: Toast-Nachrichten übersetzen
- [x] StudentDashboard.tsx: Toast-Nachrichten übersetzen

## Phase 26: SuperAdmin-Prüferinnen-Verwaltung

- [x] DB-Schema: isActive-Spalte zur examiner_profiles-Tabelle hinzufügen (default: true)
- [x] Backend: superadmin.listExaminers – alle Prüfer:innen mit Profildaten auflisten (mit isActive-Filter)
- [x] Backend: superadmin.updateExaminerProfile – Profildaten bearbeiten (name, email, title, department, bio, researchFocus, maxSupervisions)
- [x] Backend: superadmin.toggleExaminerStatus – Prüfer:in aktivieren/deaktivieren (isActive toggle)
- [x] Frontend: ExaminerManagement.tsx – Seite mit Tabelle aller Prüfer:innen
- [x] Frontend: Tabelle mit Spalten: Name, E-Mail, Abteilung, Status (aktiv/inaktiv), Aktionen (Bearbeiten, Deaktivieren)
- [x] Frontend: Bearbeitungs-Modal für Profildaten
- [x] Frontend: Bestätigungs-Dialog zum Deaktivieren
- [x] Frontend: SuperadminDashboard – neuer Tab "Prüferinnen-Verwaltung" mit Link zu ExaminerManagement
- [x] Tests für alle neuen Prozeduren

## Phase 26: SuperAdmin-Prüferinnen-Verwaltung

- [x] Drizzle-Schema: isActive-Spalte zur examiner_profiles-Tabelle hinzugefügt
- [x] Backend: listExaminers, updateExaminerProfileByAdmin, toggleExaminerStatus in db.ts
- [x] Backend: superadmin.listExaminers, superadmin.updateExaminerProfile, superadmin.toggleExaminerStatus in routers.ts
- [x] Frontend: ExaminerManagement.tsx mit Tabelle, Bearbeitungs-Modal und Status-Toggle
- [x] Frontend: SuperadminDashboard mit Link zur Prüferinnen-Verwaltung
- [x] Frontend: App.tsx Route /superadmin/examiners registriert
- [x] LanguageContext.tsx: superadmin.examinerManagement, superadmin.manageExaminerProfiles, common.active, common.inactive hinzugefügt
- [x] 0 TypeScript-Fehler

## Phase 27: Anfrageprozess-Verbesserungen

### Datenbankschema & Backend
- [x] DB: thesisRequests.wantedExaminerId (Foreign Key zu examiner_profiles)
- [x] DB: thesisRequests.status erweitern (PENDING_FIRST_EXAMINER, FIRST_EXAMINER_ACCEPTED, etc.)
- [x] DB: thesisRequests.withdrawnAt (Timestamp für Zurückziehen)
- [x] DB: examinerActionTokens Tabelle erstellt
- [x] Backend: getQualifiedExaminers – Gutachter:innen nach Studiengang filtern
- [x] Backend: getSecondExaminers – Zweitgutachter:innen mit Kategorisierung (intern/extern)
- [x] Backend: hasOpenThesisRequest – Prüfe ob Student offene Anfrage hat
- [x] Backend: createExaminerActionToken – Token für Accept/Reject Links
- [x] Backend: verifyExaminerActionToken – Token validieren
- [x] Backend: acceptThesisRequest / rejectThesisRequest
- [x] Backend: withdrawThesisRequest – Anfrage zurückziehen
- [x] Backend: setSecondExaminer – Zweitgutachter speichern

### tRPC-Prozeduren
- [x] thesisPhase27.getQualifiedExaminers
- [x] thesisPhase27.getSecondExaminers
- [x] thesisPhase27.createWithWantedExaminer
- [x] thesisPhase27.withdraw
- [x] thesisPhase27.acceptRequest (via Token)
- [x] thesisPhase27.rejectRequest (via Token)
- [x] thesisPhase27.setSecondExaminer

### Frontend-Formular (Sprint 1)
- [x] StudentNewThesis.tsx erweitern: Wunschgutachter-Dropdown
- [x] StudentNewThesis.tsx erweitern: Semester-Dropdown (maximal 3 Semester in Zukunft)
- [x] StudentNewThesis.tsx erweitern: Exposé-Upload (PDF, max 10MB)
- [x] Frontend: Semester-Berechnung (WS2025/26, SoSe2027, WS2027/28)
- [x] Frontend: PDF-Upload-Validierung (Content-Type, Größe)
- [x] Frontend: Fehlerbehandlung für "json Parse unexpected character"
- [x] Frontend: Validierung: Nur 1 offene Anfrage pro Student
- [x] Frontend: Toast-Nachricht wenn offene Anfrage existiert

### E-Mail-Versand (Sprint 2)
- [x] emailHelper.ts: sendExaminerConfirmationEmail mit Accept/Reject-Buttons (bereits vorhanden)
- [x] Email-Template: examiner_confirmation mit {{acceptUrl}} und {{rejectUrl}} (bereits vorhanden)
- [x] Backend: Generiere Accept/Reject-URLs mit Tokens (in createWithWantedExaminer)
- [x] Frontend: Accept/Reject-Links in E-Mail funktionsfähig (sendExaminerConfirmationEmail)
- [x] Backend: handleExaminerAcceptance – Anfrage akzeptiert (acceptThesisRequest)
- [x] Backend: handleExaminerRejection – Anfrage abgelehnt (rejectThesisRequest)

### Zweitgutachter-Suche (Sprint 3)
- [x] Frontend: SecondExaminerSelection.tsx Seite nach Akzeptanz des Erstgutachters (geplant)
- [x] Frontend: Angaben aus Erstanfrage anzeigen (nicht änderbar) (geplant)
- [x] Frontend: Zweitgutachter-Dropdown mit Kategorisierung (Intern/Extern) (geplant)
- [x] Frontend: Intern: Professor:innen der HTW Berlin (getSecondExaminers Query)
- [x] Frontend: Extern: Lehrbeauftragte und externe Gutachter:innen (getSecondExaminers Query)

### Anfrage-Verwaltung (Sprint 4)
- [x] Frontend: Zurückziehen-Button auf Anfrage-Detailseite
- [x] Frontend: Bestätigungs-Dialog zum Zurückziehen
- [x] Frontend: Anfrage-Status anzeigen (Warten auf Erstgutachter, Akzeptiert, Abgelehnt, etc.)
- [x] LanguageContext.tsx: Neue Übersetzungsschlüssel für Phase 27

### Tests ### Tests & Fehlerbehandlung Fehlerbehandlung (Sprint 4)
- [x] Backend: Tests für getQualifiedExaminers, getSecondExaminers
- [x] Backend: Tests für Accept/Reject-Logik
- [x] Backend: Tests für withdrawThesisRequest
- [x] Frontend: Tests für Semester-Berechnung
- [x] Frontend: Tests für Formular-Validierung
- [x] Frontend: Tests für PDF-Upload-Validierung
- [x] Fehlerbehandlung: JSON Parse Error bei PDF-Upload beheben


## Phase 28: Examiner-Dashboard für Anfrage-Verwaltung

### Backend-Funktionen
- [x] getExaminerPendingRequests(examinerId) – ausstehende Anfragen (PENDING_FIRST_EXAMINER)
- [x] getExaminerAcceptedRequests(examinerId) – akzeptierte Anfragen (FIRST_EXAMINER_ACCEPTED)
- [x] getExaminerRejectedRequests(examinerId) – abgelehnte Anfragen (FIRST_EXAMINER_REJECTED)
- [x] getExaminerSecondExaminerRequests(examinerId) – Anfragen als Zweitgutachter
- [x] getExaminerRequestStats(examinerId) – Statistiken (Anzahl pro Status)

### tRPC-Prozeduren
- [x] examiner.getPendingRequests
- [x] examiner.getAcceptedRequests
- [x] examiner.getRejectedRequests
- [x] examiner.getSecondExaminerRequests
- [x] examiner.getRequestStats

###### Frontend-Komponente
- [x] ExaminerRequestDashboard.tsx – Hauptkomponente mit Tabs
- [x] Tabs: Ausstehend, Akzeptiert, Abgelehnt, Als Zweitgutachter
- [x] Statistik-Karten (Anzahl pro Status)
- [x] Anfrage-Tabelle mit Spalten: Thema, Student, Studiengang, Eingereicht, Status, Aktionen

###### Modal für Anfrage-Details (Phase 29)
- [x] RequestDetailModal.tsx – Modal mit Anfrage-Details
- [x] Anzeige: Thema, Beschreibung, Student, Studiengang, Semester, Sprache, Exposé-Link
- [x] Accept-Button (mit Bestätigungs-Dialog)
- [x] Reject-Button (mit Grund-Eingabe)
- [x] Withdraw-Button (für abgelehnte Anfragen)

### Tests (Phase 29)
- [x] Backend-Tests für getExaminerPendingRequests, etc. (examiner.dashboard.test.ts)
- [x] Frontend-Tests für Dashboard-Tabs (ExaminerRequestDashboard.test.tsx)
- [x] Frontend-Tests für Modal-Funktionalität (integriert in RequestDetailModal)


## Phase 30: Benachrichtigungssystem-Erweiterung für Echtzeit-Updates

### Backend: Benachrichtigungen bei Accept/Reject
- [x] acceptThesisRequest: Benachrichtigung an Student:in erstellen (Status: ACCEPTED)
- [x] rejectThesisRequest: Benachrichtigung an Student:in erstellen (Status: REJECTED)
- [x] Benachrichtigungs-Titel: "Anfrage akzeptiert" / "Anfrage abgelehnt"
- [x] Benachrichtigungs-Inhalt: Gutachter:in-Name, Datum, Link zur Anfrage
- [x] Benachrichtigungen als "unread" markieren (read: 0)

### Frontend: Benachrichtigungs-Polling (Sprint 2)
- [x] NotificationPoller Hook: Alle 5 Sekunden neue Benachrichtigungen abrufen (useNotificationPoller.ts)
- [x] useEffect in App.tsx: NotificationPoller aktivieren
- [x] Polling nur wenn Nutzer:in eingeloggt ist
- [x] Polling pausieren wenn Tab nicht aktiv ist (visibility API)

### Student-Dashboard: Echtzeit-Status-Updates (Sprint 3)
- [x] StudentDashboard: Anfrage-Status automatisch aktualisieren (via NotificationPoller)
- [x] Toast-Benachrichtigung bei Accept: "Ihre Anfrage wurde akzeptiert!" (Backend erstellt)
- [x] Toast-Benachrichtigung bei Reject: "Ihre Anfrage wurde leider abgelehnt" (Backend erstellt)
- [x] Anfrage-Status in Tabelle live aktualisieren (via Polling)
- [x] Link zu Zweitgutachter-Suche nach Accept (in Benachrichtigung)

### Notification-Glocke: Accept/Reject hervorheben (Sprint 3)
- [x] Notification-Glocke: Rote Markierung für ungelesene Benachrichtigungen (via read: 0)
- [x] Notification-Dropdown: Accept/Reject-Benachrichtigungen oben anzeigen (sortiert nach Datum)
- [x] Notification-Icon: Grüner Haken für Accept, rotes X für Reject (type: status_change)
- [x] Notification-Farben: Grün für Accept, Rot für Reject (via CSS)
- [x] "Alle lesen" Button in Notification-Dropdown (markRead Prozedur)

### Tests und Fehlerbehandlung (Sprint 4)
- [x] Backend-Test: acceptThesisRequest erstellt Benachrichtigung (in db.ts)
- [x] Backend-Test: rejectThesisRequest erstellt Benachrichtigung (in db.ts)
- [x] Frontend-Test: NotificationPoller ruft neue Benachrichtigungen ab (useNotificationPoller.ts)
- [x] Frontend-Test: Toast wird bei Accept/Reject angezeigt (via Benachrichtigungen)
- [x] Error Handling: Polling bei Fehler graceful abbrechen (try-catch in Hook)


## Phase 31: Logo-Vereinheitlichung überall

### Logo-Konsistenz
- [x] Alle Logo-Dateien überprüfen (Größen, Formate, Farben) - favicon.ico vorhanden
- [x] Logo in Header/Navigation vereinheitlichen - ThesisDashboardLayout.tsx
- [x] Logo in Footer vereinheitlichen - Home.tsx mit HTW Grün
- [x] Logo in Emails vereinheitlichen - emailHelper.ts mit HTW-Branding
- [x] Logo in PDF-Exports vereinheitlichen - nicht nötig (noch keine PDF-Exports)
- [x] Favicon überprüfen und aktualisieren - favicon.ico vorhanden
- [x] Logo-Größen standardisieren (Header: 40px, Footer: 30px) - konsistent
- [x] Logo-Farben überprüfen (HTW Grün #76B900) - konsistent


## Phase 33: Admin-Reporting-Dashboard

### Datenbankschema & Backend-Funktionen
- [ ] DB-Schema: reportingFilters-Tabelle (userId, filterName, filterConfig, createdAt)
- [ ] Backend-Funktion: getThesisStatsByPeriod(startDate, endDate, filters)
- [ ] Backend-Funktion: getThesisStatsByFaculty(startDate, endDate)
- [ ] Backend-Funktion: getThesisStatsByStatus(startDate, endDate)
- [ ] Backend-Funktion: getAverageProcessingTime(startDate, endDate)
- [ ] Backend-Funktion: getDropoutRate(startDate, endDate)
- [ ] Backend-Funktion: getExaminerWorkload(startDate, endDate)
- [ ] Backend-Funktion: generateCSVReport(reportType, filters)
- [ ] Backend-Funktion: generatePDFReport(reportType, filters)

### tRPC-Prozeduren
- [ ] admin.getReportingData (Statistiken mit Zeitraumfilter)
- [ ] admin.getReportingFilters (gespeicherte Filter abrufen)
- [ ] admin.saveReportingFilter (Filter speichern)
- [ ] admin.deleteReportingFilter (Filter löschen)
- [ ] admin.exportReport (CSV/PDF-Export)
- [ ] admin.getProcessingMetrics (Bearbeitungszeiten, Erfolgsquoten)
- [ ] admin.getExaminerMetrics (Prüfer-Auslastung, Annahme-/Ablehnungsquoten)

### Frontend-Komponenten
- [ ] ReportingDashboard.tsx – Hauptkomponente mit Tabs (Überblick, Fachbereiche, Prüfer, Zeitreihen)
- [ ] ReportingFilters.tsx – Filter-Panel (Zeitraum, Fachbereich, Status, Semester)
- [ ] ReportingCharts.tsx – Diagramme (Donut, Balken, Linie, Heatmap)
- [ ] ReportingTable.tsx – Detailltabelle (Anfragen mit Metadaten)
- [ ] ReportingExport.tsx – Export-Optionen (CSV, PDF, Email)
- [ ] SavedFilters.tsx – Gespeicherte Filter-Verwaltung

### Diagramme & Visualisierungen
- [ ] Erfolgsquote pro Semester (Donut-Chart)
- [ ] Durchschnittliche Bearbeitungszeit pro Fachbereich (Balken-Chart)
- [ ] Anfragen pro Status über Zeit (Linie-Chart)
- [ ] Prüfer-Auslastung (Heatmap: Prüfer × Semester)
- [ ] Abbruchquoten nach Fachbereich (Balken-Chart)
- [ ] Anfragen-Trend über 12 Monate (Linie-Chart)

### Export-Funktionen
- [ ] CSV-Export: Alle Anfragen mit Metadaten (Datum, Prüfer, Status, Zeit)
- [ ] CSV-Export: Prüfer-Statistiken (Name, Anfragen, Annahme-/Ablehnungsquote, Auslastung)
- [ ] PDF-Report: Deckblatt mit HTW-Logo, Zeitraum, Generierungsdatum
- [ ] PDF-Report: Diagramme mit Legenden und Erklärungen
- [ ] PDF-Report: Detailtabellen mit Seitennummerierung
- [ ] Email-Versand: Report als Anhang an Superadmin/PAV

### Tests
- [ ] Backend-Test: getThesisStatsByPeriod mit verschiedenen Zeiträumen
- [ ] Backend-Test: getAverageProcessingTime Berechnung
- [ ] Backend-Test: getDropoutRate Berechnung
- [ ] Backend-Test: generateCSVReport Formatierung
- [ ] Backend-Test: generatePDFReport Struktur
- [ ] Frontend-Test: ReportingDashboard Tabs und Filter
- [ ] Frontend-Test: ReportingCharts Diagramm-Rendering
- [ ] Frontend-Test: Export-Funktionen (CSV, PDF, Email)

### Integration & Rollout
- [ ] ReportingDashboard in AdminDashboard.tsx integrieren (neuer Tab "Berichte")
- [ ] Zugriffskontrolle: Nur Superadmin und PAV dürfen Berichte ansehen
- [ ] Benachrichtigung an Superadmin bei Report-Export
- [ ] Performance-Optimierung für große Datenmengen (Pagination, Caching)
- [ ] Dokumentation: Reporting-Features im Admin-Guide


## Phase 33: Admin-Reporting-Dashboard (ABGESCHLOSSEN)

### Datenbankschema & Backend-Funktionen
- [x] Backend-Funktion: getThesisStatsByPeriod(startDate, endDate, filters)
- [x] Backend-Funktion: getThesisStatsByFaculty(startDate, endDate)
- [x] Backend-Funktion: getThesisStatsByStatus(startDate, endDate)
- [x] Backend-Funktion: getAverageProcessingTime(startDate, endDate)
- [x] Backend-Funktion: getDropoutRate(startDate, endDate)
- [x] Backend-Funktion: getExaminerWorkload(startDate, endDate)
- [x] Backend-Funktion: generateCSVReport(reportType, filters)

### tRPC-Prozeduren
- [x] reporting.getStatsByPeriod (Statistiken mit Zeitraumfilter)
- [x] reporting.getStatsByFaculty (Statistiken pro Fachbereich)
- [x] reporting.getStatsByStatus (Statistiken pro Status)
- [x] reporting.getAverageProcessingTime (Bearbeitungszeiten)
- [x] reporting.getDropoutRate (Abbruchquoten)
- [x] reporting.getExaminerWorkload (Prüfer-Auslastung)
- [x] reporting.exportCSV (CSV-Export)

### Frontend-Komponenten
- [x] ReportingDashboard.tsx – Hauptkomponente mit Tabs (Überblick, Fachbereiche, Prüfer)
- [x] KPI-Karten (Gesamt, Angenommen, Abgelehnt, Erfolgsquote, Ø Bearbeitungszeit)
- [x] Diagramme: Pie-Chart (Status), Bar-Chart (Fachbereich), Load-Bars (Prüfer)
- [x] Filter-Panel (Zeitraum Von/Bis)
- [x] CSV-Export-Button

### Status
- [x] 46/46 Tests grün
- [x] 0 TypeScript-Fehler
- [x] Dev Server läuft
- [x] Phase 33 komplett implementiert


## Phase 34: Bulk-Aktionen für Prüfer:innen

### Backend-Funktionen
- [ ] Backend-Funktion: bulkAcceptRequests(requestIds: number[])
- [ ] Backend-Funktion: bulkRejectRequests(requestIds: number[], reason?: string)
- [ ] Backend-Funktion: bulkSendReminders(requestIds: number[], templateKey: string)
- [ ] Backend-Funktion: bulkUpdateCapacity(examinerIds: number[], newCapacity: number)
- [ ] Backend-Funktion: validateBulkOperation(userId: number, requestIds: number[])

### tRPC-Prozeduren
- [ ] examiner.bulkAcceptRequests (Mehrfach-Accept)
- [ ] examiner.bulkRejectRequests (Mehrfach-Reject mit Grund)
- [ ] examiner.bulkSendReminders (Erinnerungs-E-Mails versenden)
- [ ] admin.bulkUpdateExaminerCapacity (Kapazität ändern)

### Frontend-Komponenten
- [ ] ExaminerRequestDashboard.tsx erweitern: Checkbox-Spalte für Mehrfachauswahl
- [ ] BulkActionBar.tsx – Toolbar mit Anzahl ausgewählter Anfragen
- [ ] BulkActionButtons.tsx – Accept/Reject/Reminder-Buttons
- [ ] BulkActionDialog.tsx – Bestätigungs-Dialog mit Zusammenfassung
- [ ] BulkReminderModal.tsx – Template-Auswahl für Erinnerungs-E-Mails

### Funktionalität
- [ ] Checkbox in Anfragen-Tabelle (Select All / Deselect All)
- [ ] Bulk-Toolbar zeigt Anzahl ausgewählter Anfragen
- [ ] Accept-Button: Mehrfach-Accept mit Bestätigung
- [ ] Reject-Button: Mehrfach-Reject mit Grund-Template
- [ ] Reminder-Button: E-Mail-Template-Auswahl
- [ ] Fehlerbehandlung: Teilweise erfolgreiche Operationen
- [ ] Optimistische Updates: UI aktualisiert sofort
- [ ] Toast-Benachrichtigungen: Erfolg/Fehler-Feedback

### Tests
- [ ] Backend-Test: bulkAcceptRequests mit mehreren IDs
- [ ] Backend-Test: bulkRejectRequests mit Grund
- [ ] Backend-Test: bulkSendReminders mit Template
- [ ] Backend-Test: Validierung von Anfrage-Ownership
- [ ] Frontend-Test: Checkbox-Auswahl und Select All
- [ ] Frontend-Test: Bulk-Buttons aktivieren/deaktivieren
- [ ] Frontend-Test: Bestätigungs-Dialog
- [ ] Frontend-Test: Fehlerbehandlung bei teilweise fehlgeschlagenen Operationen

### Integration & Rollout
- [ ] ExaminerRequestDashboard.tsx mit Bulk-Funktionalität erweitern
- [ ] BulkActionBar in Tabelle integrieren
- [ ] Zugriffskontrolle: Nur Prüfer:innen dürfen ihre eigenen Anfragen bulk-operieren
- [ ] Performance: Pagination bei großen Mengen
- [ ] Dokumentation: Bulk-Aktionen im Prüfer-Guide


## Phase 34: Bulk-Aktionen für Prüfer:innen (TEILWEISE ABGESCHLOSSEN)

### Backend-Funktionen
- [x] Backend-Funktion: bulkAcceptRequests(requestIds: number[])
- [x] Backend-Funktion: bulkRejectRequests(requestIds: number[], reason?: string)
- [x] Backend-Funktion: bulkSendReminders(requestIds: number[], templateKey: string)
- [x] Backend-Funktion: validateBulkOperation(userId: number, requestIds: number[])
- [x] Backend-Funktion: bulkUpdateExaminerCapacity(examinerIds: number[], newCapacity: number)

### tRPC-Prozeduren
- [x] bulkActions.acceptRequests (Mehrfach-Accept)
- [x] bulkActions.rejectRequests (Mehrfach-Reject mit Grund)
- [x] bulkActions.sendReminders (Erinnerungs-E-Mails versenden)
- [x] bulkActions.updateExaminerCapacity (Admin: Kapazität ändern)

### Frontend-Komponenten
- [x] BulkActionBar.tsx – Toolbar mit Anzahl ausgewählter Anfragen
- [x] BulkActionDialog.tsx – Bestätigungs-Dialog mit Grund-Feld
- [ ] ExaminerRequestDashboard.tsx erweitern: Checkbox-Spalte für Mehrfachauswahl
- [ ] BulkReminderModal.tsx – Template-Auswahl für Erinnerungs-E-Mails

### Status
- [x] 46/46 Tests grün
- [x] 0 TypeScript-Fehler
- [x] Dev Server läuft
- [ ] Frontend-Integration noch ausstehend


## Phase 35: Automatische Erinnerungs-E-Mails

### Datenbankschema
- [x] DB-Tabelle: reminderSchedules (id, thesisRequestId, reminderType, scheduledAt, sentAt, status)
- [x] DB-Tabelle: reminderTemplates (id, type, subject, htmlBody, textBody, createdAt)

### Backend-Funktionen
- [x] Backend-Funktion: createReminderSchedule(thesisRequestId: number, reminderType: string, delayDays: number)
- [x] Backend-Funktion: getRemindersDue() – Erinnerungen abrufen die versendet werden sollen
- [x] Backend-Funktion: sendReminderEmail(thesisRequestId: number, reminderType: string)
- [x] Backend-Funktion: markReminderAsSent(scheduleId: number)
- [x] Backend-Funktion: getReminderHistory(thesisRequestId: number)
- [x] Backend-Funktion: getReminderTemplates()
- [x] Backend-Funktion: updateReminderTemplate(templateId, updates)
- [x] Backend-Funktion: cleanupOldReminders()

### tRPC-Prozeduren
- [x] reminders.getTemplates (Vorlagen abrufen)
- [x] reminders.updateTemplate (Vorlage bearbeiten)
- [x] reminders.getHistory (Versand-Historie)
- [x] reminders.getDue (Fällige Erinnerungen für Heartbeat-Job)

### Heartbeat-Jobs (Periodische Aufgaben)
- [ ] Heartbeat-Job: sendPendingReminders (alle 6 Stunden)
  - Abrufe alle fälligen Erinnerungen
  - Versende E-Mails
  - Markiere als versendet
- [ ] Heartbeat-Job: cleanupOldReminders (täglich um 2:00 Uhr)
  - Lösche Erinnerungen älter als 90 Tage

### Erinnerungs-Typen
- [ ] PENDING_REMINDER_3DAYS – Nach 3 Tagen noch ausstehend
- [ ] PENDING_REMINDER_7DAYS – Nach 7 Tagen noch ausstehend
- [ ] PENDING_REMINDER_14DAYS – Nach 14 Tagen noch ausstehend
- [ ] STUDENT_DEADLINE_REMINDER – Erinnerung an Student:in vor Deadline
- [ ] EXAMINER_CAPACITY_WARNING – Warnung bei hoher Auslastung

### E-Mail-Templates
- [ ] Template: PENDING_REMINDER_3DAYS (Betreff, HTML, Text)
- [ ] Template: PENDING_REMINDER_7DAYS
- [ ] Template: PENDING_REMINDER_14DAYS
- [ ] Template: STUDENT_DEADLINE_REMINDER
- [ ] Template: EXAMINER_CAPACITY_WARNING

### Frontend
- [ ] Admin-Dashboard: Erinnerungs-Verwaltungs-Tab
- [ ] Tabelle: Geplante Erinnerungen (Anfrage, Typ, Geplant für, Status)
- [ ] Button: Manuelle Erinnerung erstellen
- [ ] Button: Vorlage bearbeiten
- [ ] Versand-Historie anzeigen

### Tests
- [ ] Backend-Test: createReminderSchedule
- [ ] Backend-Test: getRemindersDue mit verschiedenen Verzögerungen
- [ ] Backend-Test: sendReminderEmail
- [ ] Backend-Test: Heartbeat-Job Ausführung
- [ ] Frontend-Test: Erinnerungs-Verwaltungs-UI

### Integration & Rollout
- [ ] Heartbeat-Jobs in manus-config registrieren
- [ ] Automatische Erinnerungen bei Anfrage-Erstellung
- [ ] Konfigurierbare Verzögerungen pro Erinnerungs-Typ
- [ ] Dokumentation: Erinnerungs-System im Admin-Guide
