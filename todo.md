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
