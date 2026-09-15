# Sicherheitsprüfung – Thesis Match Maker für die HTW Berlin

**Stand:** 15. September 2026  
**Prüfgegenstand:** Aktueller Quellcode und produktive JavaScript-Abhängigkeiten der Entwicklungsumgebung.  
**Nicht umfasst:** Ein externer Penetrationstest, die IONOS-VPS-Konfiguration, DNS, Caddy, Firewall-Regeln, Betriebssystem-Patches und reale Produktionsdaten. Diese Bereiche müssen vor der öffentlichen Freigabe zusätzlich geprüft werden.

## Zusammenfassung

Eine absolute Sicherheit gegen alle Angriffe kann nicht seriös zugesichert werden. Die überprüfte Entwicklungsfassung wurde jedoch gezielt gegen relevante Angriffswege gehärtet. Der abschließende Produktions-Abhängigkeitscheck meldet **0 kritische, 0 hohe, 0 moderate und 0 niedrige** bekannte Befunde. TypeScript lief fehlerfrei; die vollständige Testsuite bestand mit **96 Testdateien und 425 Tests**.

| Bereich | Ergebnis | Bewertung |
|---|---|---|
| Passwortlogin und Sitzungen | Passwort-Hashes, HTTP-only-Cookies, sichere Cookie-Flags und SameSite-Schutz geprüft | Gehärtet |
| Rollen und Fallzugriffe | Zugriff auf Kolloquiumsdaten und ICS-Exporte serverseitig beschränkt | Gehärtet |
| Dateispeicher | Lokale Abrufpfade zentral gegen Pfadmanipulation geprüft und abgesichert | Gehärtet |
| CSV-Exporte | Zellen mit formelartigen Präfixen werden vor Tabellenformel-Injection neutralisiert | Gehärtet |
| Transferimport | Archivgröße, Dateianzahl, Entpackmenge, Pfade und Import-Token abgesichert | Gehärtet |
| Laufzeitabhängigkeiten | Aktualisiert und mit finalem Produktionsaudit geprüft | Keine bekannten Auditbefunde |

## Behobene Befunde

| Priorität vor Korrektur | Befund | Korrektur und Nachweis |
|---|---|---|
| Hoch | Lokale Speicherabrufe konnten ohne zentral durchgesetzte kanonische Pfadprüfung zu Zugriffen außerhalb des zulässigen Speicherbereichs verleiten. | Alle relevanten Abrufrouten verwenden nun die zentrale Pfadvalidierung; Regressionstests decken Traversalversuche ab. |
| Hoch | Einzelne Kolloquiumsdaten und Kalenderexporte benötigten eine explizitere, serverseitige Prüfung des Fallbezugs. | Beteiligte Personen und berechtigte Verwaltungsrollen werden serverseitig geprüft; ein fremder Abruf wird abgewiesen. |
| Mittel | Sitzungscookies waren für lokale Entwicklungsszenarien zu offen konfigurierbar. | Der reguläre Portalbetrieb verwendet `SameSite=Lax` bei HTTP-only und Secure-Cookies. |
| Mittel | Ein Transferarchiv konnte eine übermäßige Entpacklast verursachen. | Begrenzung auf 128 MB Archivgröße, maximal 10.000 Einträge und 512 MB entpackte Gesamtmenge; Pfade und Größen werden vor Inhaltsverarbeitung validiert. |
| Mittel | Import-Schlüssel wurden nicht überall über dieselbe zeitkonstante Vergleichsfunktion geprüft. | Einheitliche zeitkonstante Schlüsselprüfung für die geschützten Importendpunkte. |
| Mittel | CSV-Werte mit `=`, `+`, `-` oder `@` können beim Öffnen in Tabellenprogrammen als Formel ausgeführt werden. | Exportwerte werden vor der CSV-Ausgabe neutralisiert; vorhandene Exporttests prüfen diese Grenze. |
| Hoch | Mehrere veraltete Laufzeitabhängigkeiten hatten bekannte Sicherheitsmeldungen. | Aktualisierung u. a. von Express, tRPC, Axios, Multer, MySQL2, Nodemailer, Tiptap, AWS SDK und DOMPurify. Die XLSX-Bibliothek wurde auf SheetJS CE 0.20.3 angehoben und lokal mit Prüfsumme vendort. |

## Abhängigkeitsprüfung

Der produktive Paketbaum wurde nach den Aktualisierungen mit `pnpm audit --prod` geprüft. Dabei ergaben sich keine bekannten Befunde mehr. Die verwendete SheetJS-Version wurde über die offizielle Bezugsquelle aktualisiert; SheetJS empfiehlt eine Version ab 0.20.2 zur Behebung der ReDoS-Schwachstelle und dokumentiert den offiziellen CDN-Bezug sowie das lokale Vendoring.[1] [2]

Die Abhängigkeitsauflösung ist zusätzlich in `pnpm-workspace.yaml` festgelegt. Damit werden die sicheren Versionen für wichtige transitive Pakete, insbesondere `path-to-regexp`, `lodash`, `lodash-es` und `nanoid`, reproduzierbar aufgelöst.

## Restrisiken und Voraussetzungen vor dem Go-live

| Thema | Restrisiko | Erforderliche Maßnahme vor öffentlicher Freigabe |
|---|---|---|
| VPS und Reverse Proxy | Diese Prüfung hatte keinen administrativen Zugriff auf den laufenden VPS. Eine sichere Anwendung kann durch fehlerhafte TLS-, Firewall- oder Geheimnisverwaltung trotzdem gefährdet werden. | Einmaliger, rein lesender VPS-Abnahmeschritt: Containerstatus, lokale HTTP-Prüfung, HTTPS-Zertifikat, offene Ports und Caddy-Konfiguration prüfen. |
| Kontoschutz | Ein Passwort allein schützt Superadmin-Zugänge nur begrenzt, insbesondere bei wiederverwendeten oder schwachen Passwörtern. | Vor dem Go-live für alle Superadmin-Konten die vorhandene Zwei-Faktor-Authentifizierung aktivieren und sichere, unterschiedliche Passwörter verwenden. |
| Dauerhafte Sitzung | Eine 30-Tage-Sitzung ist auf privaten Geräten komfortabel, erhöht aber das Risiko bei verlorenen oder gemeinsam genutzten Geräten. | „Angemeldet bleiben“ nur auf eigenen Geräten verwenden; bei Verlust unverzüglich Passwort ändern und Sitzungen widerrufen. |
| E-Mail | Passwort-Reset und Benachrichtigungen sind abhängig von SMTP-Transport, Absenderdomain und Link-URL der jeweiligen Umgebung. | Versand erst nach einem einzelnen, kontrollierten Test mit korrekt eingerichteter VPS-URL freigeben. |
| Betrieb | Neue Schwachstellen können nach dieser Prüfung veröffentlicht werden. | Monatliche Abhängigkeitsprüfung, zügige Sicherheitsupdates, geschützte Backups und regelmäßige Rollenabnahme einplanen. |

> **Betriebshinweis:** Das Portal ist kein offizielles Tool der HTW Berlin. Nutzende dürfen niemals ihr echtes HTW-Berlin-Passwort in diesem Portal verwenden.

## Ergebnis

Die geprüfte Entwicklungsfassung ist gegenüber den gefundenen Angriffspfaden deutlich gehärtet und weist im finalen produktiven Abhängigkeitsaudit keine bekannten Meldungen auf. Eine verbindliche Aussage über die öffentliche VPS-Instanz ist erst nach einer separaten, rein lesenden Betriebsabnahme möglich. Insbesondere ist ein externer Penetrationstest vor einem hochschulweiten Produktivbetrieb weiterhin empfehlenswert.

## Referenzen

[1] [SheetJS CE – Installation und lokales Vendoring](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)  
[2] [SheetJS CE – CVE-2024-22363 und empfohlene Aktualisierung](https://cdn.sheetjs.com/advisories/CVE-2024-22363)  
[3] [PNPM – Workspace-Overrides und Lieferkettenschutz](https://pnpm.io/10.x/settings)
