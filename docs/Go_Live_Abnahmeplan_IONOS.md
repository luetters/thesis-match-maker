# Go-live-Abnahmeplan: Thesis Match Maker auf dem IONOS-VPS

**Stand:** 22. August 2026  
**Ziel:** Fachliche, technische und sicherheitsbezogene Abnahme vor der öffentlichen DNS-Umstellung von `thesismatch.online`.

> Der portable Datenimport ist abgeschlossen. Die Zielumgebung enthält 61 Nutzer:innen, 36 Thesis-Anträge und 26 importierte Dateien. Die SMTP-Zustellung wurde mit einer einzelnen Testnachricht geprüft. Es werden bis zur expliziten Freigabe keine Passwort-Reset-E-Mails an Portalnutzer:innen versendet.

## 1. Testbedingungen vor der Abnahme

Die DNS-Zone bleibt während der gesamten Abnahme unverändert. Der öffentliche Produktivzugang wird erst nach erfolgreichem Abschluss aller Pflichtpunkte aktiviert. Für Tests sind ausschließlich vorher benannte interne Personen zu verwenden. Neue Testdaten werden eindeutig mit `TEST` gekennzeichnet und nach Abschluss gelöscht oder dokumentiert.

| Voraussetzung | Verantwortlich | Erledigt, wenn |
|---|---|---|
| Passwort-Reset zurückgestellt | Projektleitung | Keine Sammel- oder Einzelbenachrichtigung an importierte Konten ausgelöst wurde. |
| SMTP bereit | Technik | Eine technische Test-E-Mail wurde durch IONOS akzeptiert. |
| Testgruppe benannt | Projektleitung | Je eine interne Person für Superadmin, Verwaltung, Erstprüfung, Zweitprüfung und Studierende ist benannt. |
| Testdatenregeln bestätigt | Alle Testenden | Keine echten, nicht erforderlichen personenbezogenen Daten und keine realen Geheimnisse werden eingetragen. |

## 2. Technische Abnahme

Die technische Abnahme wird vor der Browser-Abnahme durchgeführt. Sie bestätigt, dass die Anwendung auf dem VPS stabil, von der Datenbank getrennt abgesichert und für HTTPS vorbereitet ist.

| Prüfschritt | Durchführung | Soll-Ergebnis |
|---|---|---|
| Containerstatus | `docker ps` auf dem VPS | App- und Datenbankcontainer sind jeweils als `healthy` sichtbar. |
| Lokaler App-Endpunkt | `curl -I http://127.0.0.1:3000/` auf dem VPS | HTTP-Status 200 oder eine erwartete Weiterleitung. |
| Datenbankgrenzen | Docker-Compose-Konfiguration und Firewall prüfen | MySQL ist nicht über das Internet erreichbar; nur die App kann sie nutzen. |
| Datenintegrität | Stichprobe im Verwaltungsbereich gegen den Export | Nutzerzahlen, Anträge und zugeordnete Dokumente entsprechen plausibel dem Import. |
| Dokumentzugriff | Einen existierenden, berechtigten Fall testen | Datei ist für berechtigte Rollen erreichbar, nicht aber über einen anonym kopierten Link. |
| Sicherungsweg | Transferarchiv und dokumentierter Exportweg prüfen | Das geprüfte Transferarchiv bleibt bis zur finalen Abnahme als Rückfallebene erhalten. |
| HTTPS-Vorbereitung | Caddy-Konfiguration und DNS-Ziel prüfen | Caddy ist für die Domain vorbereitet; DNS wird erst nach der Abnahme geändert. |

## 3. Kontrollierter Passworttest

Da Passwort-Hashes nicht in das portable Transferarchiv übernommen wurden, braucht mindestens eine interne Testperson einen neuen Zugang. Dies ist **kein** Massenversand: Die Projektleitung löst nur für die eigene, vorab bestimmte Testadresse über **„Passwort vergessen?“** einen Reset aus. Nach Zustellung wird der Link einmalig verwendet und die erfolgreiche Anmeldung dokumentiert.

| Prüfschritt | Soll-Ergebnis |
|---|---|
| Reset für eine interne Testadresse anfordern | Reset-Nachricht trifft ein; keine andere Person wird angeschrieben. |
| Link öffnen und Passwort setzen | Link ist einmalig, zeitlich begrenzt und führt zu einem sicheren Passwort-Dialog. |
| Anmeldung mit neuem Passwort | Zugang funktioniert; Hinweis zum abweichenden HTW-Berlin-Passwort bleibt sichtbar. |
| Wiederverwendung des Links | Der bereits verwendete Link wird abgewiesen. |

## 4. Rollenbasierte fachliche Abnahme

Die Testgruppe prüft jeweils nur ihren vorgesehenen Ablauf. Jede Abweichung wird mit Rolle, Uhrzeit, reproduzierbaren Schritten und erwarteter Wirkung notiert.

| Rolle | Kernabläufe | Pflichtkriterium |
|---|---|---|
| Studierende | Registrierung, Sprachwechsel DE/EN, Profil, Thesis-Vorschlag, Auswahl Erstprüfer:in, Dokumenthinweis | Keine Freigabe- oder Verwaltungsrechte sichtbar; Sperrvermerk- und Einwilligungsinformationen sind korrekt. |
| Erstprüfer:in | Profil, Fachbereich, Zweitprüfungsrecht, Anfrage annehmen/ablehnen, Abgabestatus, Kolloquium | Eigene Fälle und Dokumente sichtbar; keine Verwaltung fremder Fachbereiche. |
| Zweitprüfer:in | Anfrage prüfen, Thema und Dokumente einsehen, annehmen/ablehnen | Keine Funktionen der Erstprüfung, die nicht zur Rolle gehören. |
| Verwaltung | Freigabeliste, fachbereichsbezogene Filter, Fristen, Sperrvermerk, Export, Audit-Log | Nur zuständige Fachbereiche und Studiengänge bearbeitbar. |
| Superadmin | Rollenfreigaben, E-Mail-Vorlagen, Migrationseinstellungen, Sicherheitsübersicht | Globale Funktionen sind nur hier sichtbar und Änderungen werden protokolliert. |

## 5. E-Mail-, Sprach- und Sicherheitsabnahme

Die produktive SMTP-Konfiguration wurde bereits mit einer technischen Nachricht geprüft. Vor dem Go-live wird nur mit der vorgesehenen Testgruppe geprüft, ob Vorlagen, Absender und Links korrekt sind. Es darf keine Nachricht an nicht beteiligte Nutzer:innen ausgelöst werden.

| Prüfschritt | Soll-Ergebnis |
|---|---|
| Registrierungstest | Eine Freischaltungsnachricht nutzt die gewählte Sprache und enthält den Sicherheitshinweis zum HTW-Berlin-Passwort. |
| Passwort-Reset | Sprache, Absender, Einmallink und Ablaufzeit sind nachvollziehbar. |
| Englisch | Statische Oberfläche, zentrale Systemmeldungen und E-Mail-Vorlagen sind konsistent übersetzt. |
| Unberechtigter Aufruf | Direkter Aufruf geschützter Seiten oder Dateien wird abgewiesen. |
| 2FA | Für eine Testrolle Einrichtung, Wiederherstellungscode und verpflichtende Frist prüfen. |
| Audit-Log | Rollen-, Sperrvermerk- und Freigabeänderungen sind einer Person und einem Fall zuordenbar. |

## 6. Abnahmeprotokoll und Go-live-Entscheidung

Ein Pflichtpunkt gilt nur als bestanden, wenn das beobachtete Ergebnis dokumentiert ist. Kritische Fehler, insbesondere Datenverlust, unberechtigter Zugriff, fehlerhafte Rollenrechte, fehlende Dokumente oder nicht zustellbare Pflicht-E-Mails, blockieren den Go-live.

| Status | Bedeutung | Entscheidung |
|---|---|---|
| Bestanden | Ergebnis entspricht dem Soll-Zustand. | Punkt abhaken. |
| Bestanden mit Hinweis | Kein Sicherheits- oder Funktionsblocker; Nacharbeit terminiert. | Nur mit dokumentierter Frist zulässig. |
| Blocker | Datenschutz, Sicherheit, Rollenrechte, Daten oder Kernprozess beeinträchtigt. | DNS-Umstellung aussetzen. |

Nach bestandener Abnahme erfolgen die finalen Schritte in dieser Reihenfolge:

1. Caddy für die Produktionsdomain aktivieren und von einem externen Netz HTTPS sowie Zertifikat prüfen.
2. DNS von `thesismatch.online` auf die VPS-IP umstellen und die Erreichbarkeit erneut prüfen.
3. Erst danach den gezielten Passwort-Reset-Versand freigeben: entweder für alle importierten Konten oder ausschließlich für frühere Magic-Link-Nutzer:innen.
4. Den Versand sowie erste Anmeldungen im Login-Protokoll und in der Sicherheitsübersicht beobachten.

## 7. Kurzprotokoll

| Datum/Uhrzeit | Testende Person | Rolle | Prüfschritt | Ergebnis | Blocker / Ticket |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

