# Status der IONOS-VPS-Zielumgebung

**Stand:** 21. August 2026  
**System:** Thesis Match Maker für die HTW Berlin  
**Zweck:** Vorbereitung einer unabhängigen Zielumgebung ohne Umstellung des laufenden Portals.

## Bestätigter Stand

Der neue IONOS-VPS wurde mit Ubuntu 26.04 und Docker eingerichtet. Docker sowie Docker Compose sind installiert; der Programmstand wurde ohne Produktionsdaten nach `/opt/thesis-match-maker` übertragen. Die lokale Konfigurationsdatei `deploy/.env` wurde auf dem VPS mit neuen, ausschließlich dort geltenden Geheimnissen angelegt und mit restriktiven Dateirechten geschützt.

Die Firewall lässt ausschließlich die notwendigen Ports für Administration und späteren Webbetrieb zu:

| Port | Zweck |
|---|---|
| 22/TCP | SSH-Verwaltung |
| 80/TCP | HTTP-Prüfung und spätere Zertifikatsausstellung |
| 443/TCP | HTTPS-Betrieb über Caddy |

Die Anwendungsdatei wurde auf dem VPS erfolgreich als Docker-Image gebaut. Eine leere, nicht öffentlich erreichbare MySQL-Datenbank läuft innerhalb des Docker-Netzwerks; der Datenbankzugang wurde aus dem Datenbankcontainer geprüft. Die Anwendung und Caddy sind noch nicht gestartet. Es existiert keine DNS-Umstellung auf `thesismatch.online`.

## Sicherung der Quellinstanz

Für den laufenden Plattformbetrieb wurden die beiden offiziellen Sicherungspakete erstellt und vom Eigentümer separat geprüft sowie sicher abgelegt:

| Paket | Inhalt |
|---|---|
| `.manusaccount` | Kontoinformationen, Einstellungen und Wiederherstellungsbezug |
| `.manustask` | Aufgaben, Website-Code, Datenbank, hochgeladene Dateien und zugehörige Konfiguration zum Exportzeitpunkt |

Die Pakete dürfen weder umbenannt noch entpackt oder in das Repository eingecheckt werden. Sie sind nicht in das IONOS-Projekt kopiert worden.

## Schutzgrenzen vor dem nächsten Schritt

Bis ein offiziell bestätigter Importweg für Datenbank und Dateien vorliegt, gelten folgende Regeln:

1. Die Anwendung und Caddy bleiben auf dem VPS gestoppt.
2. Die Domain `thesismatch.online` bleibt unverändert auf den bisherigen Betrieb gerichtet.
3. Die Sicherungspakete werden nicht verändert, geteilt oder im Chat hochgeladen.
4. Es wird kein behaupteter SQL-Export aus einer `.manustask`-Datei abgeleitet.
5. Ein DNS-Wechsel erfolgt erst nach importierter Datenbasis, fachlicher Abnahme und dokumentiertem Rückfallpunkt.

## Nächster Entscheidungsbedarf

Der nächste Schritt ist **keine** technische Serveraktion, sondern die Klärung des zulässigen Wiederherstellungs- oder Importwegs für die offiziellen Sicherungspakete. Erst wenn eine exportierbare Datenbank- und Dateibasis in einem dokumentierten Format vorliegt, kann die vorbereitete Wiederherstellungsroutine auf dem IONOS-VPS verwendet werden.
