# Modularisierungswelle 1

## Ziel und Sicherheitsprinzip

Die erste Welle zerlegt ausschließlich fachlich geschlossene Bereiche mit stabilen Schnittstellen. Die öffentliche tRPC-Struktur und bestehende Datenbanktabellen bleiben unverändert. Dadurch können Client, Berechtigungslogik und bestehende Links ohne Funktionsänderung weiterarbeiten.

## Ausgelagerte Fachmodule

| Bereich | Neues Modul | Verantwortlichkeit |
|---|---|---|
| Private Prüfer:innennotizen | `server/db/examinerComments.ts` | Eigene Notizen, Priorität, Fälligkeit, Abschluss, Suche und Löschen |
| Notiz-API | `server/routers/examinerCommentsRouter.ts` | Ausschließlich eigene private Notizen per tRPC |
| FAQ-Rückmeldungen | `server/db/faq.ts` | Anonyme Fragen, aggregierte Bewertungen und redaktionelle Veröffentlichung |
| FAQ-API | `server/routers/faqRouter.ts` | Öffentliche Rückmeldung sowie geschützte Verwaltung |
| Notizbibliothek | `client/src/components/examiner/PrivateNotesLibrary.tsx` | Suche und Export persönlicher Notizen |
| Login-Protokoll | `client/src/components/admin/LoginAttemptsView.tsx` | Filter, Kennzahlen und Tabelle der Anmeldeversuche |
| Prüfer:innenzuweisung | `client/src/components/admin/AssignExaminerModal.tsx` | Direkte Zuordnung einer Erst- oder Zweitprüferin bzw. eines Erst- oder Zweitprüfers |
| Fristen und Abschlussakte | `server/db/deadlines.ts` | Friständerungen, Fristenregeln, Verteidigungsdatum und Fallabschluss |
| Kolloquien | `server/db/colloquiums.ts` | Anlegen, Abfragen, Statusänderungen und Beteiligungslisten |
| Fristenrouter | `server/routers/deadlineProcedures.ts` | Typstabile PAV- und Verwaltungsverfahren für Frist, Verteidigung, Fallabschluss und Historie |
| Prüfer:innenkolloquien | `client/src/components/examiner/MyColloquiums.tsx` | Anzeige und ICS-Download ausschließlich eigener Kolloquien |

## Aktueller Effekt

Die zentralen Dateien behalten die API-Zusammensetzung und gemeinsame Infrastruktur. Fachlogik der ersten und zweiten Welle liegt jedoch nun in **elf eigenständig testbaren Modulen**. Die zugehörigen Tests für FAQ, Notizen, Fristen, Kolloquien und Exporte bleiben grün.

## Nächste Wellen

1. `server/db.ts`: Thesis-Anfragen, Kommissionsbildung, Fristen und Kolloquien in separate Datenmodule verschieben.
2. `server/routers.ts`: Authentifizierung, Thesis-Lebenszyklus, Verwaltung, Kolloquium und Infrastruktur als Fachrouter zusammensetzen.
3. `ExaminerDashboard.tsx`: Betreuungsstatus, Anfragen, Kolloquium und Berichte in eigene Komponenten auslagern.
4. `AdminDashboard.tsx`: Anfragen, Audit, Nutzerverwaltung und Statistik als getrennte Bereiche belassen bzw. weiter auslagern.

Jede Welle muss die bestehenden tRPC-Pfade beibehalten, gezielte Regressionstests erhalten und vor der Veröffentlichung eine vollständige TypeScript-Prüfung bestehen.
