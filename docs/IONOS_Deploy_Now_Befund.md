# Befund: IONOS Deploy Now und `thesismatch.online`

**Stand:** 21. August 2026  
**Ergebnis:** IONOS Deploy Now ist **nicht** die geeignete Betriebsumgebung für den vollständigen Thesis Match Maker. Das Produkt kann den statischen Frontend-Build ausliefern, bietet jedoch keinen Node.js-Server zur Laufzeit. Der Thesis Match Maker benötigt einen laufenden Node.js-/Express-Server, MySQL, geschützte Datei-Uploads, Passwort- und TOTP-Login, E-Mail-Versand sowie zeitgesteuerte Hintergrundaufgaben.

> **Entscheidung:** `thesismatch.online` sollte auf einen IONOS VPS (oder einen Hetzner Cloud Server) mit Docker übertragen werden. IONOS Deploy Now kann allenfalls für eine separate statische Informationsseite eingesetzt werden – nicht für das Portal selbst.

## 1. Nachweis zum bisherigen Fehler

Die Domain [`https://thesismatch.online`](https://thesismatch.online) liefert am 21. August 2026 eine leere IONOS-Fehlerseite mit **HTTP 403 Forbidden** und dem Text „You don't have permission to access this resource.“

Die GitHub-Actions-Historie enthält einen fehlgeschlagenen Lauf vom 19. August 2026. Der Fehler trat bereits im Job **„check readiness“** auf; die Schritte **„build“** und **„trigger deployment“** wurden übersprungen. Die Ursache des ersten Fehlers liegt daher vor dem eigentlichen Build.

| Befund | Auswirkung | Bewertung |
|---|---|---|
| Der Workflow ruft `ionos-deploy-now/project-action@v1` mit `secrets.IONOS_API_KEY` und einer festen Projekt-ID auf. | Ohne gültigen, berechtigten Schlüssel oder bei einem deaktivierten/nicht mehr zugänglichen Deploy-Now-Projekt scheitert der Readiness-Job. | **Wahrscheinliche unmittelbare Ursache**; der Geheimniswert konnte aus Sicherheitsgründen nicht eingesehen werden. |
| Der Workflow verweist auf `.deploy-now/thesis-match-maker/config.yaml`. Diese Datei existiert im Repository nicht. | Nach Behebung des Readiness-Fehlers würde der Artefakt-Upload ebenfalls scheitern. | **Sicherer Folgefehler.** |
| Das Workflowziel `thesismatchmaker` existiert nicht und der Workflow führt kein `pnpm build` aus. | Es wird kein Veröffentlichungsordner mit `index.html` erzeugt. | **Sicherer Folgefehler und plausible Erklärung für 403.** |
| Der tatsächliche Build erzeugt `dist/index.js` und `dist/public/index.html`. | Das erste ist der Node.js-Server; das zweite ist nur die Oberfläche. | Der statische Teil allein ist nicht das vollständige Portal. |

Die offizielle IONOS-FAQ nennt für einen 403-Fehler insbesondere eine fehlende `index.html` im veröffentlichten Ordner oder einen falsch konfigurierten Ausgabeordner. [1]

## 2. Warum Deploy Now den Thesis Match Maker nicht betreiben kann

IONOS dokumentiert Deploy Now als Plattform für **statische Projekte und PHP-Projekte**. Node.js steht in GitHub Actions zur Verfügung, um statische Dateien zu bauen, jedoch nicht als Serverlaufzeit. Serverseitiges Rendering beziehungsweise eine dauerhafte Node.js-Laufzeit wird ausdrücklich nicht angeboten. [1] [2]

> **Wichtige Unterscheidung:** Node.js kann bei Deploy Now im GitHub-Build laufen, zum Beispiel für `pnpm build`. Das ist nicht dasselbe wie ein dauerhaft laufender Node.js-Server. Der Thesis Match Maker braucht nach dem Build weiterhin `node dist/index.js`, damit Anmeldung, API, Datenbankzugriff, Uploads, E-Mails und Hintergrundjobs funktionieren.

| Benötigte Portal-Funktion | Erforderliche Laufzeit | Mit Deploy Now möglich? |
|---|---|---|
| React-Oberfläche | statische Dateien | ja |
| tRPC-/Express-API | dauerhafter Node.js-Prozess | nein |
| Passwort-Login und Sitzungen | Server + MySQL | nein |
| Rollen, Fristen, Audit-Log und Thesis-Fälle | MySQL + Serverlogik | nein |
| Dokumentuploads und geschützter Zugriff | Server + privater Speicher | nein |
| SMTP-Versand und Erinnerungen | Serverprozess + Scheduler | nein |
| TOTP-Zwei-Faktor-Authentifizierung | Server + Verschlüsselungsschlüssel | nein |

Ein Versuch, nur `dist/public` zu Deploy Now hochzuladen, würde deshalb höchstens eine optische Oberfläche ohne Anmeldung, Daten, Uploads und geschützte Funktionen liefern. Dies ist für den produktiven Einsatz nicht vertretbar.

## 3. Empfohlene Route für IONOS

Der vorhandene Umzugsstack ist für einen **IONOS VPS** vorgesehen. Er besteht aus Docker Compose, der Node.js-Anwendung, MySQL 8 und Caddy als HTTPS-Reverse-Proxy. Diese Route ermöglicht die vollständige Funktionalität und vermeidet die technische Begrenzung von Deploy Now.

| Schritt | Was in IONOS zu tun ist |
|---|---|
| 1 | IONOS VPS mit Ubuntu 24.04 und fester IPv4-Adresse bestellen. |
| 2 | Die Domain `thesismatch.online` per A-Record auf die Server-IP zeigen lassen. |
| 3 | Das bereitgestellte Quellarchiv auf den VPS kopieren und `deploy/.env` anhand von `deploy/environment.example` befüllen. |
| 4 | Datenbank- und Dateiexport sicher importieren. |
| 5 | Docker Compose starten, HTTPS von Caddy ausstellen lassen und fachliche Tests durchführen. |
| 6 | Erst nach bestandenem Restore- und Funktionstest die Domain endgültig umschalten. |

Die detaillierten Befehle und Abnahmetests stehen in `docs/Umzug_und_Betrieb_Thesis_Match_Maker.md` und deren PDF-Fassung.

## 4. Was im IONOS-Deploy-Now-Konto bereinigt werden sollte

Der vorhandene Deploy-Now-Workflow sollte **nicht** weiter als Produktionsroute für das Portal verwendet werden. Nach der Entscheidung für den VPS-Betrieb sollte die automatische Deploy-Now-Verknüpfung im IONOS-Dashboard deaktiviert oder aus dem GitHub-Repository entfernt werden, damit keine weiteren fehlgeschlagenen Builds entstehen.

Falls `thesismatch.online` bereits als Deploy-Now-Domain registriert ist, kann sie nach Abschluss des DNS-Wechsels vom alten Deploy-Now-Projekt gelöst und dem VPS zugeordnet werden. Die Domainregistrierung selbst bleibt davon unberührt.

### Status nach Löschung des bisherigen Deploy-Now-Projekts

Die Löschung des Deploy-Now-Projekts entfernt nach normalem IONOS-Verhalten die **Bereitstellungskonfiguration** und mögliche zugehörige Deploy-Now-Geheimnisse, nicht jedoch das GitHub-Repository oder die Domainregistrierung. Das Repository `luetters/thesis-match-maker`, die erhaltenen Workflowdateien und der DNS-Eintrag für `thesismatch.online` bestehen weiterhin. Ein neues Deploy-Now-Projekt könnte deshalb technisch separat angelegt werden, wäre für das vollständige Portal aber weiterhin nur ein statischer Test – kein produktiver Ersatz.

## 5. Falls eine rein statische Informationsseite gewünscht ist

Für eine separate Informationsseite ohne Anmeldung, Datenbank, Dateien oder interne Prozesse wäre Deploy Now geeignet. In diesem Fall müsste der Build-Workflow `pnpm build` ausführen und **ausschließlich** `dist/public` als Veröffentlichungsordner verwenden. Dies ist jedoch ein eigenes, von der Portal-Anwendung getrenntes Projekt.

## 6. Offene Punkte

| Offener Punkt | Wo er zu klären ist |
|---|---|
| Ist `IONOS_API_KEY` in GitHub noch vorhanden und für das alte Deploy-Now-Projekt berechtigt? | GitHub → Repository → Settings → Secrets and variables → Actions; IONOS Deploy Now Dashboard |
| Ist das IONOS Deploy Now Projekt mit der festen Projekt-ID noch aktiv? | IONOS Deploy Now Dashboard → Projektübersicht |
| Welche IONOS-VPS-Größe und welche Betriebsadresse sollen verwendet werden? | IONOS Control Center und Projektleitung |
| Liegt ein aktueller Datenbank- und Dateiexport vor? | Sicherungs- bzw. Exportprozess vor dem Cutover |

## Referenzen

[1]: [IONOS Deploy Now FAQ: Laufzeitgrenzen für Node.js und Ursachen für HTTP 403](https://docs.ionos.space/docs/faq/)

[2]: [IONOS Deploy Now: statische Projekte, GitHub-Build und Domains/TLS](https://docs.ionos.space/docs/deploy-static-sites/)

[3]: [IONOS Deploy Now: Build-Konfiguration und Veröffentlichungsordner](https://docs.ionos.space/docs/github-actions-customization/)

[4]: [IONOS Deploy Now: Konfigurationsübersicht](https://docs.ionos.space/docs/configuration-overview/)
