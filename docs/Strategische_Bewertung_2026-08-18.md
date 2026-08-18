# Strategische Bewertung – Thesis-Management-Portal HTW Berlin

**Datum:** 18. August 2026
**Autor:** Manus AI

---

## 1. Weiterentwicklung ohne zusätzliche personenbezogene Daten

Das Portal erhebt derzeit ausschließlich die für den Prüfungsprozess notwendigen Stammdaten: Name, E-Mail-Adresse, Studiengang, Matrikelnummer, Fachbereich und Rolleninformationen. Alle nachfolgenden Vorschläge arbeiten ausschließlich mit diesen bereits vorhandenen Daten oder mit rein systeminternen, nicht personenbezogenen Kennzahlen.

### 1.1 Prozessoptimierung

| Vorschlag | Beschreibung | Personenbezogene Daten |
|---|---|---|
| **Automatische Statusbenachrichtigungen** | Studierende und Prüfer:innen erhalten bei jedem Statuswechsel einer Anfrage eine konfigurierbare E-Mail. Derzeit erfolgen Benachrichtigungen nur bei ausgewählten Übergängen. | Keine neuen – nutzt vorhandene E-Mail und Name. |
| **Vorlagen für Gutachtenstruktur** | Prüfer:innen können wiederverwendbare Textbausteine für Gutachten anlegen und beim Abschluss einer Arbeit auswählen. | Keine – rein redaktionelle Inhalte ohne Personenbezug. |
| **Checkliste für Verwaltung** | Pro Anfrage eine konfigurierbare Checkliste (z. B. „Immatrikulationsbescheinigung geprüft", „Prüfungsamt informiert"), die den Bearbeitungsstand sichtbar macht. | Keine neuen – Häkchen beziehen sich auf den Vorgang, nicht auf die Person. |
| **Archivierung abgeschlossener Semester** | Abgeschlossene Anfragen werden nach Ablauf eines konfigurierbaren Zeitraums in ein Archiv verschoben und aus der aktiven Ansicht entfernt, bleiben aber für Statistiken verfügbar. | Keine neuen – arbeitet mit vorhandenen Zeitstempeln. |
| **Massenaktionen für Verwaltung** | Mehrere Anfragen gleichzeitig freigeben, ablehnen oder einem Semester zuordnen, um die Bearbeitungszeit bei Semesterbeginn zu verkürzen. | Keine neuen. |

### 1.2 Qualitätssicherung und Transparenz

| Vorschlag | Beschreibung | Personenbezogene Daten |
|---|---|---|
| **Fortschrittsanzeige für Studierende** | Eine visuelle Fortschrittsleiste im Studierenden-Dashboard, die den aktuellen Stand der Arbeit von der Anmeldung bis zur Verteidigung zeigt. | Keine neuen – aggregiert vorhandene Statuswerte. |
| **Automatische Fristwarnung** | Studierende und Prüfer:innen erhalten 14 und 7 Tage vor Ablauf der Abgabefrist eine Erinnerung. Die Verwaltung sieht eine Übersicht aller bald fälligen Arbeiten. | Keine neuen – nutzt vorhandene Fristen und E-Mail. |
| **Bewertungsworkflow** | Nach der Verteidigung tragen Erst- und Zweitgutachter:in ihre Note ein. Die Verwaltung gibt die Note frei und das Ergebnis wird im Studierenden-Dashboard sichtbar. | Keine neuen – die Note bezieht sich auf den Vorgang. |
| **Statistik-Dashboard für Dekanat** | Aggregierte, anonymisierte Kennzahlen pro Fachbereich: durchschnittliche Bearbeitungsdauer, Ablehnungsquote, Verteidigungen pro Semester. Keine Einzelpersonenansicht. | Keine – ausschließlich aggregierte Werte. |

### 1.3 Benutzerfreundlichkeit

| Vorschlag | Beschreibung | Personenbezogene Daten |
|---|---|---|
| **Benachrichtigungszentrale im Portal** | Statt nur E-Mails eine In-App-Benachrichtigungsliste mit Lesebestätigung, damit Nutzer:innen nichts übersehen. | Keine neuen – nutzt vorhandene Ereignisse. |
| **Favoriten für Prüfer:innen** | Studierende können Prüfer:innen als Favoriten markieren, um sie bei der Anfrage schneller zu finden. | Keine neuen – speichert nur eine Zuordnung zwischen vorhandenen IDs. |
| **Hilfe- und FAQ-Bereich** | Ein konfigurierbarer Hilfebereich mit häufigen Fragen, den die Verwaltung selbst pflegen kann. | Keine – rein redaktionelle Inhalte. |
| **Dunkelmodus** | Ein systemweiter Dunkelmodus für alle Dashboards, der die Barrierefreiheit verbessert. | Keine. |

---

## 2. Bereitschaft für die anderen Fachbereiche

### 2.1 Aktueller Stand

Die Datenbank enthält **81 offizielle LSF-Studiengänge** mit den Kürzeln der HTW Berlin, verteilt auf alle fünf Fachbereiche:

| Fachbereich | Bachelor | Master | Gesamt |
|---|---:|---:|---:|
| FB1 – Gestaltung und Kultur | 7 | 6 | 13 |
| FB2 – Ingenieurwissenschaften – Technik und Leben | 8 | 10 | 18 |
| FB3 – Wirtschafts- und Rechtswissenschaften | 7 | 12 | 19 |
| FB4 – Informatik, Kommunikation und Wirtschaft | 10 | 7 | 17 |
| FB5 – Gestaltung und Kultur (Bau, Energie, Umwelt) | 7 | 7 | 14 |
| **Gesamt** | **39** | **42** | **81** |

### 2.2 Technische Bereitschaft

Das Portal ist **vollständig auf alle fünf Fachbereiche vorbereitet**. Folgende Strukturen sind bereits implementiert:

**Fachbereichstrennung** ist durchgängig umgesetzt. Verwaltungsmitarbeiter:innen erhalten bei der Freigabe durch Superadmins genau ein Fachbereichsrecht (FB1–FB5) und sehen ausschließlich Studierende ihres eigenen Fachbereichs. Prüfer:innen können mehreren Fachbereichen zugeordnet werden. Die Kreuztabelle zeigt fachbereichsübergreifende Betreuungen transparent an.

**Studiengangszuordnung** erfolgt bei der Registrierung automatisch über den gewählten Studiengang, der einem Fachbereich zugeordnet ist. Die Fristenverwaltung unterstützt individuelle Anmelde- und Abgabefristen je Fachbereich, Studiengang und Semester.

**Rollenmodell** ist fachbereichsunabhängig. Alle Rollen (Studierende, Erst-/Zweitprüfer:innen, Verwaltung, PA-Vorsitz, Dekanat, Studiengangsleitung, Superadmin) funktionieren identisch für jeden Fachbereich.

### 2.3 Organisatorische Schritte für den Rollout

Für die Aufnahme weiterer Fachbereiche sind **keine Codeänderungen** erforderlich. Notwendig sind ausschließlich organisatorische Maßnahmen:

1. **Verwaltungspersonal registrieren** – Verwaltungsmitarbeiter:innen der neuen Fachbereiche registrieren sich und werden durch Superadmins mit dem passenden Fachbereichsrecht freigeschaltet.
2. **Prüfer:innen einladen** – Die Verwaltung informiert die Prüfer:innen ihres Fachbereichs über das Portal und den Registrierungsprozess.
3. **Fristen pflegen** – Die Verwaltung trägt die fachbereichsspezifischen Anmelde- und Abgabefristen für das aktuelle Semester ein.
4. **Studiengangsliste prüfen** – Die 81 Studiengänge sollten mit dem aktuellen LSF-Stand abgeglichen und bei Bedarf durch Superadmins ergänzt werden.
5. **SAML-2.0 optional aktivieren** – Falls die HTW Berlin die vorbereitete SAML-Integration freigibt, können alle Fachbereiche sofort die zentrale Hochschulanmeldung nutzen.

---

## 3. Bereitstellung auf einem IONOS-Server

### 3.1 Architekturübersicht

Das Portal besteht aus folgenden Komponenten, die alle auf einem einzelnen Server betrieben werden können:

| Komponente | Technologie | IONOS-Äquivalent |
|---|---|---|
| **Webserver + API** | Node.js 22 + Express 4 | Läuft direkt auf dem Server |
| **Datenbank** | MySQL 8 / TiDB (kompatibel) | MySQL auf demselben Server oder IONOS Managed MySQL |
| **Dateispeicher** | S3-kompatible API (Manus Forge) | IONOS S3 Object Storage oder lokaler Dateispeicher |
| **E-Mail-Versand** | SMTP (Nodemailer) | Beliebiger SMTP-Server (HTW Berlin, IONOS, Mailgun) |
| **Hintergrundjobs** | Manus Heartbeat (Cron-HTTP) | node-cron oder systemd-Timer |
| **Reverse Proxy** | Manus Edge | nginx oder Caddy mit Let's Encrypt |
| **Authentifizierung** | Eigene JWT-Sitzungen + Passwort | Vollständig autark – kein externer OAuth-Dienst |

### 3.2 Zu ersetzende Manus-Abhängigkeiten

Das Portal nutzt derzeit vier Manus-spezifische Dienste, die bei einer Migration ersetzt werden müssen:

| Abhängigkeit | Aktueller Dienst | Ersatz auf IONOS | Aufwand |
|---|---|---|---|
| **Dateispeicher** | Manus Forge Presign → S3 | IONOS S3 Object Storage oder lokales Dateisystem mit Express-Middleware | Mittel – `server/storage.ts` und `server/_core/storageProxy.ts` anpassen |
| **Hintergrundjobs** | Manus Heartbeat (externe Cron-HTTP-Aufrufe) | `node-cron` im selben Prozess oder ein systemd-Timer, der `curl` aufruft | Gering – ein Modul ersetzen |
| **OAuth-Callback** | Manus OAuth (wird als Fallback registriert, aber nicht aktiv genutzt) | Entfällt – das Portal verwendet ausschließlich Passwort-Login und optional SAML | Gering – toter Code entfernen |
| **Statische Assets** | `manus-upload-file --webdev` → CDN-URLs | Lokaler `public/`-Ordner oder IONOS CDN | Gering – URLs in Code und Datenbank anpassen |

### 3.3 Empfohlene IONOS-Konfiguration

Für den produktiven Betrieb mit bis zu 500 gleichzeitigen Nutzer:innen empfiehlt sich folgende Konfiguration:

| Ressource | Empfehlung |
|---|---|
| **Server** | IONOS VPS L (4 vCPU, 8 GB RAM, 240 GB SSD) oder Cloud Server M |
| **Betriebssystem** | Ubuntu 24.04 LTS |
| **Datenbank** | MySQL 8.0 auf demselben Server (bei >1000 Nutzer:innen: IONOS Managed MySQL) |
| **Dateispeicher** | IONOS S3 Object Storage (10 GB reichen für Exposés und Dokumente) |
| **Domain** | thesis.htw-berlin.com → DNS A-Record auf die IONOS-IP |
| **TLS** | Let's Encrypt via Caddy oder certbot |
| **Reverse Proxy** | Caddy (automatisches HTTPS) oder nginx |
| **Prozessmanager** | PM2 oder systemd-Service für Node.js |
| **Backup** | Täglicher MySQL-Dump + S3-Snapshot |
| **Kosten** | ca. 12–18 EUR/Monat (VPS + S3) |

### 3.4 Migrationsschritte

1. **Server einrichten** – Ubuntu 24.04, Node.js 22, MySQL 8, nginx/Caddy installieren.
2. **Code klonen** – Das GitHub-Repository enthält den vollständigen Quellcode.
3. **Umgebungsvariablen setzen** – `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`-Variablen konfigurieren.
4. **Dateispeicher ersetzen** – `server/storage.ts` auf IONOS S3 oder lokalen Speicher umstellen.
5. **Hintergrundjobs ersetzen** – `server/_core/heartbeat.ts` durch `node-cron` ersetzen.
6. **Statische Assets migrieren** – Alle `/manus-storage/`-URLs durch lokale oder CDN-Pfade ersetzen.
7. **Datenbank migrieren** – MySQL-Dump importieren, Drizzle-Migrationen ausführen.
8. **Build erstellen** – `pnpm install && pnpm build` auf dem Server.
9. **Reverse Proxy konfigurieren** – Caddy/nginx auf Port 3000 weiterleiten, HTTPS aktivieren.
10. **DNS umstellen** – thesis.htw-berlin.com auf die neue IP zeigen.

### 3.5 Geschätzter Aufwand

| Arbeitsschritt | Geschätzter Aufwand |
|---|---|
| Dateispeicher-Adapter schreiben und testen | 4–6 Stunden |
| Hintergrundjob-Modul ersetzen | 2–3 Stunden |
| Statische Assets migrieren | 1–2 Stunden |
| Server einrichten und konfigurieren | 3–4 Stunden |
| Datenbank migrieren und verifizieren | 2–3 Stunden |
| End-to-End-Test auf IONOS | 3–4 Stunden |
| **Gesamt** | **15–22 Stunden** |

---

## 4. Zusammenfassung

Das Portal ist **technisch vollständig auf alle fünf Fachbereiche vorbereitet**. Die 81 offiziellen Studiengänge sind importiert, die Fachbereichstrennung ist durchgängig implementiert und der Rollout erfordert ausschließlich organisatorische Maßnahmen.

Eine **Migration auf einen IONOS-Server ist realisierbar** und erfordert die Ersetzung von vier Manus-spezifischen Diensten (Dateispeicher, Hintergrundjobs, OAuth-Fallback, Asset-URLs). Der geschätzte Aufwand liegt bei 15–22 Stunden. Die laufenden Kosten betragen ca. 12–18 EUR/Monat.

Für die **Weiterentwicklung ohne zusätzliche personenbezogene Daten** stehen zahlreiche Optionen zur Verfügung: automatische Fristwarnungen, ein Bewertungsworkflow, Verwaltungschecklisten, Massenaktionen und ein aggregiertes Statistik-Dashboard für das Dekanat.
