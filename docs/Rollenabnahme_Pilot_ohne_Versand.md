# Rollenabnahme mit Pilotkonten – ohne Versand und DNS-Änderung

Diese Abnahme dient ausschließlich der fachlichen Prüfung des bestehenden IONOS-VPS vor dem öffentlichen Go-live. Während des gesamten Durchlaufs bleiben `thesismatch.online`, Caddy-Konfiguration und DNS unverändert. Passwort-Reset-E-Mails, Sammelversände und neue Einladungen sind nicht Bestandteil dieses Dokuments.

| Rolle | Abnahmeweg | Erwarteter Nachweis |
|---|---|---|
| Superadmin | Mit dem vorhandenen Superadmin-Passwortkonto anmelden; anschließend die Verwaltungs-, Prüfungs- und Studierendensicht über den Sichtwechsel öffnen. | Die drei Ansichten sind erreichbar; die Superadmin-Berechtigung bleibt erhalten; der Sichtwechsel erscheint im Audit-Log. |
| Verwaltung | Mit dem vorhandenen Pilotkonto anmelden und Freigabeliste, Fachbereichsfilter, Audit-Log sowie Antragsübersicht öffnen. | Nur zulässige Verwaltungsaktionen sind möglich; Sperrvermerkänderungen bleiben begründungspflichtig. |
| Erstprüfung | Mit dem vorhandenen Pilotkonto anmelden und einen bereits zugewiesenen Fall öffnen. | Thema, berechtigte Unterlagen, Status und Prüfungsfunktionen sind sichtbar. |
| Zweitprüfung | Mit dem vorhandenen Pilotkonto anmelden und einen bereits zugewiesenen Fall öffnen. | Thema und berechtigte Unterlagen sind sichtbar; Funktionen der Erstprüfung bleiben gesperrt. |
| Studierende | Mit dem vorhandenen Pilotkonto anmelden und einen bestehenden Antrag öffnen. | Status, Dokumenthinweise, Einwilligungen und Sprache werden korrekt dargestellt. |

## Kontrollschritte

Jede Testperson dokumentiert ausschließlich Rolle, Uhrzeit, anonymisierte Antragsnummer, Prüfschritt und Ergebnis. Screenshots werden vor der Weitergabe auf Namen, Matrikelnummern, E-Mail-Adressen und Dokumentinhalte geprüft. Ein beobachteter Berechtigungsfehler, ein nicht erreichbarer berechtigter Dokumentdownload oder ein ungewollter E-Mail-Versand gilt als Go-live-Blocker.

| Prüfschritt | Soll-Ergebnis | Versand/DNS |
|---|---|---|
| Anmeldung mit vorhandenem Testpasswort | Zugriff ohne Passwort-Reset oder neue E-Mail | Nicht auslösen |
| Sprachwechsel Deutsch/Englisch | Die aktuell geöffnete Ansicht zeigt zentrale Texte in der gewählten Sprache | Nicht auslösen |
| Antrags-PDF herunterladen | Genau eine Seite mit HTW-Berlin-Logo, QR-Code und Footer | Nicht auslösen |
| Geschützten Dokumentlink anonym öffnen | Zugriff wird abgewiesen | Nicht auslösen |
| Rollenwechsel Superadmin | Die Fachansicht wechselt, ohne Superadmin-Rechte zu verlieren | Nicht auslösen |

Nach Abschluss aller fünf Rollen wird das Ergebnis in den Go-live-Abnahmeplan übernommen. Erst bei dokumentiert bestandenen Pflichtpunkten kann die Projektleitung getrennt über DNS-Aktivierung und einen späteren Passwort-Reset-Versand entscheiden.
