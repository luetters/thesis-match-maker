# Kritische Architekturprüfung des Thesis-Management-Portals

**Stand:** 19. August 2026  
**Ziel:** Bewertung der technischen Tragfähigkeit für einen fachbereichsübergreifenden Betrieb und eine spätere autarke Bereitstellung auf IONOS oder Hetzner.  
**Bewertungsmaßstab:** Sicherheit, Datenschutz, Fachbereichstrennung, Betriebsstabilität, Wartbarkeit und Erweiterbarkeit – ohne zusätzliche personenbezogene Daten zu erheben.

## Kurzfazit

Das Portal besitzt bereits einen umfangreichen fachlichen Funktionskern: rollenbasierte Abläufe, Fachbereichszuordnungen, Dokumente, Fristen, Kolloquien, Mehrsprachigkeit, optionale 2FAS-Absicherung, Exporte und administrative Auswertungen. Die bisherigen Sicherheitsmaßnahmen sind eine belastbare Grundlage. Für einen breiten Rollout über alle Fachbereiche und einen eigenständigen IONOS- oder Hetzner-Betrieb ist jedoch eine **gezielte Konsolidierungsphase** notwendig.

> **Kernbewertung:** Fachlich ist das Portal weit fortgeschritten. Architektonisch sollte es vor einem hochschulweiten Regelbetrieb von einer funktionsorientierten, stark zentralisierten Codebasis zu klar abgegrenzten Fachmodulen mit transaktionalen Kernabläufen, verbindlichem Betriebsvertrag und automatisierten Qualitätsbarrieren weiterentwickelt werden.

| Bereich | Bewertung | Begründung |
|---|---|---|
| Fachliche Abdeckung | **Gut** | Die zentralen Abläufe von Antrag bis Verteidigung sind implementiert. |
| Zugriffssteuerung | **Solide, ausbaufähig** | Rollen, Fachbereiche und berechtigte Dokumentenzugriffe existieren; die Rechteprüfung sollte zentralisiert und systematisch testbar werden. |
| Datenkonsistenz | **Ausbaufähig** | Mehrstufige Geschäftsprozesse erfolgen teils über aufeinanderfolgende Einzelabfragen statt über Datenbanktransaktionen. [1] |
| Wartbarkeit | **Kritisch für weiteres Wachstum** | Router, Datenzugriff und mehrere Dashboardseiten sind sehr groß und vereinen mehrere fachliche Verantwortlichkeiten. [1] [2] |
| Eigenbetrieb | **Vorbereitet, noch nicht abgenommen** | Lokaler/S3-Speicheradapter, Docker-Entwurf und Scheduler existieren; Konfiguration, TLS, Secrets, Backups und Failover müssen in einer realen Zielumgebung getestet werden. [3] [4] |
| Lieferkettensicherheit | **Zeitnah behandeln** | Die Produktionsabhängigkeitsprüfung meldet eine kritische sowie mehrere hohe Sicherheitsmeldungen; ein kontrolliertes Update ist erforderlich. [5] |

## Verifizierte Architekturbeobachtungen

Die folgende Tabelle trennt belastbare Beobachtungen aus dem aktuellen Projekt von daraus abgeleiteten Maßnahmen. Die Priorisierung richtet sich nicht nur nach technischer Eleganz, sondern nach dem Risiko für Prüfungsprozesse und personenbezogene Daten.

| Priorität | Beobachtung | Risiko im Hochschulbetrieb | Empfohlene Maßnahme |
|---|---|---|---|
| **P0** | Die aktuelle Produktionsabhängigkeitsprüfung meldet eine kritische sowie 27 hohe Meldungen. Betroffen sind unter anderem `fast-xml-parser`, `@trpc/server`, `drizzle-orm` und `axios`. [5] | Bekannte Schwachstellen bleiben trotz guter Anwendungscode-Qualität Bestandteil des Systems. | Abhängigkeitsupdate in einer separaten Wartungsänderung durchführen; jede Paketgruppe einzeln aktualisieren, vollständige Regressionstests ausführen und nur dann veröffentlichen. |
| **P0** | Der Server vertraut gegenwärtig allen Forwarded-Headern über `trust proxy: true`. [3] | Bei eigenem Reverse Proxy können IP-basierte Rate Limits oder Sicherheitsprotokolle durch falsch konfigurierte Proxy-Weitergabe verfälscht werden. | Vertrauenswürdige Proxy-Netze explizit konfigurieren und einen HTTP-/HTTPS-Test hinter Caddy oder Nginx durchführen. |
| **P0** | Der eigenständige Scheduler wird nur aktiviert, wenn `SCHEDULER_ENABLED=true` gesetzt ist. Fehlt `CRON_SECRET`, warnt der Scheduler selbst, dass Hintergrundaufrufe nicht authentifiziert sind. [4] | Frist-, Kolloquiums- und 2FA-Erinnerungen könnten nach einer Migration ausfallen oder ungeschützt erreichbar sein. | In der Produktionskonfiguration beide Werte verpflichtend machen; Start ohne `CRON_SECRET` im Eigenbetriebsmodus fehlschlagen lassen und einen täglichen Scheduler-Selbsttest protokollieren. |
| **P1** | `server/routers.ts` umfasst rund 6.000 Zeilen und enthält mehr als 30 Unterrouter; `server/db.ts` umfasst rund 7.600 Zeilen. [1] [2] | Änderungen an einer Rolle oder einem Fachbereich können unbeabsichtigt fachfremde Abläufe beeinflussen. Code-Reviews und Tests werden zunehmend teuer. | Router, Services und Repositories nach fachlichen Modulen aufteilen: `thesis`, `identity`, `examiners`, `colloquium`, `deadlines`, `documents`, `faq`, `reporting` und `admin`. |
| **P1** | In der Datenzugriffsschicht ist mindestens eine manuelle Einzelverbindung über `mysql2.createConnection` vorhanden; mehrstufige Workflows verwenden nicht durchgängig Drizzle-Transaktionen. [2] | Unter paralleler Nutzung können Teilzustände entstehen, etwa bei Zuweisungen, Statuswechseln, Audit-Protokollen oder Benachrichtigungen. | Einen zentralen MySQL-Pool einsetzen und für geschäftskritische Workflows explizite Transaktionen inklusive Audit-/Outbox-Eintrag verwenden. |
| **P1** | Das Prüfer:innen-Dashboard umfasst rund 5.100 Zeilen und verwendet an mehreren Stellen `any`-Casts. [6] | Typinformationen gehen an komplexen Schnittstellen verloren; Fehler treten später und näher am Prüfungsprozess auf. | Fachliche Teilkomponenten, Zod-Ausgabeformen und gemeinsame View-Modelle einführen; `any` schrittweise durch benannte Typen ersetzen. |
| **P1** | Der Docker-Entwurf enthält keinen integrierten Reverse Proxy mit TLS-Terminierung, keine Ressourcenlimits und standardmäßig lokalen Dateispeicher; S3 ist nur konfigurierbar. [7] | Ein VPS-Betrieb wird ohne ergänzende Infrastruktur nicht ausreichend gegen Ausfälle, Fehlkonfigurationen oder Ressourcenerschöpfung geschützt. | Produktions-Compose um Caddy/Nginx, TLS, Healthchecks, CPU-/RAM-Limits und verpflichtenden externen S3-Speicher ergänzen. |
| **P2** | Der aktuelle Schedulerstatus in der Entwicklungsumgebung verwendet noch den Plattform-Heartbeat als Rückfall. [3] [4] | Die Selbstständigkeit des Codes ist vorbereitet, aber nicht durch einen echten IONOS-/Hetzner-Abnahmelauf bewiesen. | Einen wiederholbaren Staging-Abnahmetest mit `SCHEDULER_ENABLED=true`, S3, SMTP und Reverse Proxy etablieren. |
| **P2** | Es bestehen 54 serverseitige Vitest-Dateien. Die Regressionstests sind wertvoll, decken aber keinen vollständigen End-to-End-Ablauf mit Browser, Datenbank, E-Mail-Stub und Scheduler ab. [8] | Ein Zusammenspiel mehrerer Subsysteme kann trotz Unit-/Router-Tests fehlschlagen. | Drei priorisierte Ende-zu-Ende-Abläufe automatisieren: Registrierung/Freigabe, Antrag/Kommission/Dokument, Frist/Erinnerung/Kolloquium. |

## Zielarchitektur

Die Zielarchitektur muss die vorhandenen Funktionen **nicht neu erfinden**. Sie trennt Verantwortung klarer und macht den Betrieb auf eigener Infrastruktur nachvollziehbar.

```text
Browser / Mobilgerät
        │ HTTPS
Reverse Proxy (Caddy oder Nginx)
        │
Express + tRPC-Anwendung
 ├── Identity & Session
 ├── Thesis Workflow
 ├── Examiner & Capacity
 ├── Deadlines & Colloquium
 ├── Documents & Storage
 ├── FAQ & Content
 └── Reporting & Administration
        │                 │
 MySQL-Pool + Transaktionen     S3-kompatibler Objektspeicher
        │                 │
 Audit-/Outbox-Einträge     Private, signierte Dokumentabrufe
        │
 Scheduler/Worker → E-Mail und Fristen
```

| Architekturbaustein | Zielzustand | Nutzen |
|---|---|---|
| **Feature-Module** | Jeder Fachbereich erhält Router, Service, Repository, Zod-Schemata und Tests in einem Modul. | Änderungen bleiben auf fachliche Grenzen beschränkt. |
| **Berechtigungspolitik** | Zentraler Policy-Layer für Rolle, Fachbereich, Fallbeteiligung und Dokumentzugriff. | Gleiche Regel wird nicht in mehreren Routern kopiert; Fachbereichssicht lässt sich besser prüfen. |
| **Transaktions- und Outbox-Muster** | Statusänderung, Audit-Eintrag und ausstehende E-Mail werden in einem Datenbankvorgang vorbereitet. | Kein Fall bleibt fachlich geändert, aber ohne Audit oder Benachrichtigung zurück. |
| **Storage-Schnittstelle** | Ein klarer Adapter für lokalen Speicher, IONOS S3 und Hetzner Object Storage; produktiv ist S3 verpflichtend. | Der Speicheranbieter bleibt austauschbar und Dokumente bleiben privat. |
| **Worker/Scheduler** | Ein definierter Scheduler-Prozess mit Secret, Healthcheck und Laufprotokoll. | Fristen und Erinnerungen sind unabhängig von Plattformdiensten überprüfbar. |
| **Konfigurationsvertrag** | Validierte Umgebungsvariablen beim Start; fehlende Produktionsgeheimnisse lassen den Prozess kontrolliert abbrechen. | Fehlkonfigurationen werden vor dem ersten fachlichen Vorgang sichtbar. |
| **Beobachtbarkeit** | Strukturierte, personenbezogene Daten minimierende Logs, technische Metriken und Alarmregeln. | Störungen lassen sich erkennen, ohne unnötige Nutzerdaten in Logs zu speichern. |

## Priorisierte Roadmap

### Priorität 0: Vor einem breiten Rollout

| Maßnahme | Ergebnis | Aufwand |
|---|---|---|
| Sicherheitsupdates kontrolliert einspielen | Kritische und hohe Abhängigkeitsmeldungen werden geschlossen oder bewusst mit dokumentierter Ausnahme behandelt. | 2–4 Arbeitstage |
| Eigenbetriebs-Startvertrag erzwingen | `CRON_SECRET`, SMTP, `SITE_URL`, S3 und Datenbankzugang werden beim Start validiert; Eigenbetrieb startet ohne diese Werte nicht. | 1–2 Arbeitstage |
| Reverse Proxy und TLS verbindlich machen | Caddy/Nginx, explizites `trust proxy`, HTTPS-Weiterleitung und sichere Header sind Teil der Referenzbereitstellung. | 1–2 Arbeitstage |
| Staging-Abnahme auf IONOS oder Hetzner | Eine getrennte Testumgebung beweist S3, SMTP, Scheduler, Backups, QR-Dokumente und Login. | 2–3 Arbeitstage |

### Priorität 1: Vor der Öffnung weiterer Fachbereiche

| Maßnahme | Ergebnis | Aufwand |
|---|---|---|
| Transaktionsgrenzen für Kernabläufe | Kommissionsbildung, Statuswechsel, Fristen, Audit und Benachrichtigungen sind konsistent. | 4–7 Arbeitstage |
| Feature-Module einführen | Große Router- und Datenbankdateien werden schrittweise entkoppelt, ohne Funktionsverlust. | 8–15 Arbeitstage, iterativ |
| Zentralen Berechtigungs-/Fachbereichscheck einführen | Jede administrative Datenabfrage ist automatisch auf Rolle, Fachbereich und Fallbezug begrenzt. | 4–6 Arbeitstage |
| Vollständige Backup- und Wiederherstellungsübung | MySQL- und S3-Wiederherstellung werden gemessen und dokumentiert. | 1–2 Arbeitstage |

### Priorität 2: Betrieb und Qualität kontinuierlich stärken

| Maßnahme | Ergebnis | Aufwand |
|---|---|---|
| Ende-zu-Ende-Tests | Kritische Nutzerpfade werden browsernah gegen eine Testdatenbank geprüft. | 5–8 Arbeitstage |
| View-Modelle und weniger `any` | Dashboards bleiben auch bei neuen Anforderungen zuverlässig änderbar. | 5–10 Arbeitstage, iterativ |
| Datenaufbewahrungsplan | Abgelehnte, zurückgezogene und archivierte Fälle folgen freigegebenen Lösch- bzw. Anonymisierungsregeln. | Fachliche Entscheidung + 3–5 Arbeitstage |
| Betriebsmonitoring | Dashboard-/Alarmregeln für Backups, Scheduler, Speicherzugriff und E-Mail-Zustellung. | 3–5 Arbeitstage |

## Datenschutzfreundliche Verbesserung ohne neue personenbezogene Daten

Die folgenden Maßnahmen benötigen keine zusätzlichen Nutzerangaben: technische Healthchecks, aggregierte Fehlerraten, anonymisierte Prozesszeiten, Auslastungen je Fachbereich, Prüfungsstatus, Fristtreue, Scheduler-Laufprotokolle und Informationssicherheitsmetriken. Sie können die Akzeptanz erhöhen, wenn ihre Funktion transparent erklärt wird und keine Individualüberwachung erfolgt.

Für die spätere Datenaufbewahrung sollte die HTW Berlin fachlich entscheiden, welche Fristen für abgelehnte Anträge, zurückgezogene Anfragen, abgeschlossene Prüfungsakten, E-Mail-Protokolle und Audit-Daten gelten. Die Architektur sollte diese Entscheidung anschließend per konfigurierbarer Regel umsetzen, statt sie in Programmcode zu verstecken.

## Entscheidungsempfehlung

Die empfehlenswerte Reihenfolge lautet: **erst Lieferkettensicherheit und Eigenbetrieb absichern, dann Transaktions- und Berechtigungsgrenzen konsolidieren, anschließend die Fachmodule schrittweise extrahieren.** Dadurch bleibt das Portal für die laufenden Fachbereiche nutzbar und gewinnt gleichzeitig die Stabilität, die für weitere Fachbereiche sowie IONOS oder Hetzner erforderlich ist.

## Referenzen

[1]: ../server/routers.ts "Zentraler tRPC-Router"
[2]: ../server/db.ts "Datenzugriff und Geschäftslogik"
[3]: ../server/_core/index.ts "Express-Server, Middleware und Hintergrundendpunkte"
[4]: ../server/scheduler.ts "Eigenständiger Scheduler"
[5]: ../package.json "Produktionsabhängigkeiten; Prüfung mit pnpm audit --prod vom 19. August 2026"
[6]: ../client/src/pages/ExaminerDashboard.tsx "Prüfer:innen-Dashboard"
[7]: ../deploy/docker-compose.yml "Referenz für die Container-Bereitstellung"
[8]: ../server "Serverseitige Vitest-Tests"
