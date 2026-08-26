# Verbleibende Restaufgaben und Reihenfolge vor dem VPS-Export

Die noch offenen Punkte sind nach der lokalen Fertigstellung keine weiteren Portalentwicklungen. Sie betreffen entweder die produktive IONOS-VPS-Umgebung, die externe DNS-Verwaltung, die offizielle Datensicherung oder ausdrücklich zurückgestellte Kommunikationsschritte. Sie dürfen deshalb weder in der Entwicklungsumgebung vorgetäuscht noch vor einem späteren Export erledigt werden.

| Reihenfolge | Aufgabenbereich | Voraussetzung | Auslöser |
|---|---|---|---|
| 1 | Lokale Codekorrekturen und Dokumente | Projekt- und Teststand lokal vollständig geprüft | Bereits laufend; kein Export erforderlich |
| 2 | Geheimnisfreies Releasearchiv | Lokale Aufgaben abgeschlossen und Checkpoint vorhanden | Ausdrückliche Freigabe der Projektleitung |
| 3 | Kontrollierter FileZilla-Deploy auf den VPS | Vollständiger Upload von `thesis-source.zip` | Separate leere Datei `DEPLOY.ready` |
| 4 | VPS-Abnahme | Erfolgreicher Health-Check nach Deploy | Testkonten, ohne Sammelversand |
| 5 | Einzelner Passwort-Reset für Pilotkonto | VPS-Ausgabe ist aktiv und geprüft | Ausdrückliche Freigabe, nur Zieladresse |
| 6 | DNS- und öffentlicher Go-live | Sämtliche VPS-Abnahmepunkte bestanden | Separate ausdrückliche Freigabe |

## Verbleibende externe Abhängigkeiten

Die offenen Punkte zu HTTPS, Caddy, Ports, Datenbankzustand, Backups, DNS, realer E-Mail-Zustellung und Portalzugriff können nur auf dem IONOS-VPS geprüft werden. Die Punkte zu offizieller Website-Sicherung und ihrer Wiederherstellung hängen von den außerhalb dieses Projekts bereitgestellten Sicherungspaketen ab. Der einzelne Passwort-Reset für das Pilotkonto bleibt absichtlich zurückgestellt, damit sein Link mit der produktiven VPS-URL und der dortigen Datenbank verknüpft ist.

> Der bisherige Windows-OpenSSH-Weg ist nicht mehr offen: Der kontrollierte, eingeschränkte FileZilla-SFTP-Ablauf mit Upload nach `/incoming` und separatem `DEPLOY.ready`-Auslöser ist die verbindliche Bereitstellungsmethode.
