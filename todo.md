# Thesis-Management HTW Berlin – TODO

## Datenbankschema
- [x] Drizzle-Schema: users-Tabelle mit Rollen (student, examiner, admin)
- [x] Drizzle-Schema: thesisRequests-Tabelle mit Status-Enum (PENDING, ACCEPTED, REJECTED, MATCHED)
- [x] Drizzle-Schema: auditLog-Tabelle für alle Statusänderungen
- [x] Drizzle-Schema: examiners-Profiltabelle (Tags, Sprachen, Studiengang)
- [x] DB-Migration pushen (pnpm db:push)

## Backend / tRPC-Routers
- [x] server/db.ts: Query-Helfer für thesisRequests, auditLog, examiners
- [x] router: thesis.create (Student reicht Anfrage ein)
- [x] router: thesis.list (gefiltert nach Rolle)
- [x] router: thesis.updateStatus (Admin ändert Status + AuditLog-Eintrag)
- [x] router: thesis.assignExaminer (Admin weist Prüfer zu)
- [x] router: examiner.list (öffentliche Prüfer-Profile)
- [x] router: examiner.respondViaToken (JWT-gesicherter Login-freier Endpunkt)
- [x] router: auditLog.all (Admin-only)
- [x] JWT-Helfer: signExaminerActionToken / verifyExaminerActionToken für E-Mail-CTAs
- [x] router: admin.users, admin.updateUserRole

## Frontend
- [x] HTW-Design-System: CSS-Variablen (Grün #006937 / oklch, Navy, Gold)
- [x] ThesisDashboardLayout mit barrierefreier Sidebar-Navigation (alle Rollen)
- [x] Rollen-basiertes Routing in App.tsx
- [x] Studenten-Dashboard: eigene Anfragen, Status-Badges, neue Anfrage einreichen, Prüfer-Suche
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
