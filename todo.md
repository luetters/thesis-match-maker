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
