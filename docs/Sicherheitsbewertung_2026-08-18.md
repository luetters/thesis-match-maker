# Sicherheitsbewertung des Thesis-Management-Portals

**Prüfstand:** 18. August 2026  
**Methode:** Passive Quellcode-, Konfigurations- und Abhängigkeitsanalyse. Es wurden keine produktiven Angriffe, keine Lasttests und keine externen Penetrationstests durchgeführt.

## Zusammenfassung

Die vorhandenen Schutzmaßnahmen sind substanziell: HTTPS/HSTS, Helmet, CSP, Rate Limits, Größenlimits, signaturbasierte Prüfungen für mehrere Uploads, Zugriffskontrollen und TOTP-2FA sind implementiert. Die Prüfung hat jedoch mehrere **konkrete verbleibende Risiken** identifiziert. Besonders prioritär sind eine gespeicherte XSS-Angriffsfläche in Profilinhalten, der öffentliche Zugriff auf Storage-Schlüssel sowie eine weiterhin aktive Legacy-E-Mailaktion mit nicht gebundener Aktion und fehlender atomarer Einmaligkeitsprüfung.

| Priorität | Befund | Einstufung | Warum es zählt |
|---|---|---:|---|
| P0 | Gespeicherte XSS über Profil- und Prüfer:innenbiografien | Kritisch | Angreifende können JavaScript im Browser anderer Portalpersonen ausführen lassen. |
| P0 | Öffentliche Storage-Proxys für beliebige Schlüssel | Hoch | Bekannte oder geleakte Schlüssel können sensible Dokumente ohne Anmeldung ausliefern. |
| P0 | Legacy-E-Mailaktion ist nicht an die signierte Aktion gebunden und nicht einmalig | Hoch | Ein abgefangener Link kann innerhalb von 24 Stunden wiederholt oder für die Gegenaktion missbraucht werden. |
| P1 | Kritische und hohe Abhängigkeitsmeldungen | Hoch | Aktualisierungsbedarf in produktiv installierten Bibliotheken, insbesondere `fast-xml-parser`, `xlsx`, Drizzle und tRPC. |
| P1 | SAML- und Host-Header-Risiken bei späterer Aktivierung | Mittel | Betrifft die vorbereitete, derzeit optional geschaltete SAML-Integration. |

## Bestätigte Befunde

### P0 – Gespeicherte Cross-Site Scripting (XSS) in Biografien

| Aspekt | Befund |
|---|---|
| Fundstellen | `server/routers.ts:336–394`, `server/db.ts:4695–4730`, `client/src/pages/ExaminerDirectory.tsx`, `client/src/pages/PublicProfile.tsx`, `client/src/pages/Profile.tsx` |
| Ursache | `bio`, `examinerBio` und `examinerResearchFocus` werden nur auf Länge validiert, aber unverändert gespeichert. Mehrere Seiten rendern diese Werte mit `dangerouslySetInnerHTML`. |
| Auswirkung | Eine registrierte Person mit Profilbearbeitung könnte beim Besuch eines Profils Skripte in Browsern von Studierenden, Prüfer:innen oder Verwaltungsmitarbeitenden ausführen. Die aktuelle CSP mindert Inline-Skripte, erlaubt aber externe Skripte von beliebigen HTTPS-Quellen (`script-src 'self' https:`). |
| Maßnahme | HTML grundsätzlich als Text ausgeben. Falls Rich Text fachlich nötig ist: serverseitig und zusätzlich clientseitig mit einer eng konfigurierten Allowlist sanitieren; insbesondere keine Skripte, Ereignisattribute, SVG, `iframe`, `style` oder externe URLs zulassen. CSP auf `script-src 'self'` reduzieren. |

### P0 – Sensible Speicherobjekte über öffentliche Proxys erreichbar

| Aspekt | Befund |
|---|---|
| Fundstellen | `server/_core/storageProxy.ts:4–58`, `server/uploadRoutes.ts:261–288`, `server/storage.ts:31–97` |
| Ursache | Die Routen `/manus-storage/*` und `/api/storage/*` akzeptieren jeden Schlüssel ohne Anmeldung oder Autorisierungsprüfung, erzeugen serverseitig eine Abruf-URL und antworten mit öffentlichem Caching. |
| Auswirkung | Die Schutzwirkung beruht allein auf der Geheimhaltung des Storage-Schlüssels. Das passt nicht zu Exposés, bedingten Dokumenten, Avataren und weiteren personenbezogenen Dateien. Ein Schlüssel kann über Browser-Verlauf, Protokolle, Referer, E-Mails, Screenshots oder eine spätere Informationslücke bekannt werden. |
| Maßnahme | Öffentliche und private Objekte strikt trennen. Nur freigegebene Medien dürfen einen öffentlichen Pfad erhalten. Für Dokumente: Autorisierung gegen Datenbankmetadaten vor jedem Abruf, kurzlebige signierte URLs und `Cache-Control: private, no-store`; keine Speicherung vollständiger privater URLs in Auditdaten oder API-Antworten. |

### P0 – Legacy-Aktion aus Gutachter:innen-E-Mail kann Aktion wechseln und wiederholt werden

| Aspekt | Befund |
|---|---|
| Fundstellen | `server/routers.ts:1497–1539`, `server/jwtHelper.ts:4–35`, Versand unter `server/routers.ts:1371–1384` |
| Ursache | Der signierte JWT enthält `action`, aber `respondViaToken` verarbeitet stattdessen das frei übermittelte `input.action`. Zusätzlich wird kein serverseitiger Einmalstatus geprüft oder gesetzt. |
| Auswirkung | Wer einen noch gültigen E-Mail-Link besitzt, kann die entgegengesetzte Aktion anfordern und sie bis zum Ablauf wiederholen. Dies gefährdet die Integrität des Matching-Prozesses und kann doppelte Statuswechsel oder irreführende Audit-Einträge erzeugen. |
| Maßnahme | Legacy-Endpunkt deaktivieren oder vollständig auf `examiner_action_tokens` umstellen. Aktion aus dem signierten bzw. gespeicherten Token erzwingen; Token vor der Fachaktion atomar als verwendet markieren (`UPDATE ... WHERE used_at IS NULL`) und den Statusübergang in derselben Transaktion prüfen. Der Fallback-Schlüssel in `jwtHelper.ts:15` muss entfernt werden; bei fehlendem `JWT_SECRET` muss der Start fehlschlagen. |

### P1 – Offene Abhängigkeitsmeldungen in Produktionspaketen

Der Produktionsaudit meldete **1 kritisch, 27 hoch, 54 mittel und 11 niedrig**. Die tatsächliche Ausnutzbarkeit hängt vom jeweiligen Nutzungspfad ab; die folgenden direkten oder produktiv transitiven Pakete sollten dennoch priorisiert aktualisiert werden.

| Paket / Pfad | Auditbefund | Einordnung und Maßnahme |
|---|---|---|
| `fast-xml-parser@5.2.5` über `@aws-sdk/client-s3` | Kritisch: Entity-Encoding-Bypass / Regex-Injection; Patch ab `5.3.5` | AWS-SDK und transitive XML-Pakete aktualisieren. Das Risiko ist besonders relevant, wenn XML aus nicht vollständig vertrauenswürdigen Quellen verarbeitet wird. |
| `xlsx@0.18.5` | Mehrere hohe Meldungen, u. a. Prototype Pollution und ReDoS; laut Audit kein gepatchter npm-Release | Wird im Browser in `ExaminerManagement.tsx` importiert. XLSX-Import in isolierten Worker verlagern, Dateigrößen und Tabellenumfang begrenzen; mittelfristig Ersatzbibliothek evaluieren. |
| `drizzle-orm@0.44.6` | Hoch: SQL-Injection bei unzureichend maskierten dynamischen Identifikatoren; Patch ab `0.45.2` | Auf aktuelle kompatible Version aktualisieren. Die statischen Tabellen-/Spaltenreferenzen im geprüften Kerncode begrenzen die aktuelle Exposition, das Paket bleibt aber updatepflichtig. |
| `@trpc/server@11.6.0` | Hoch: mögliche Prototype Pollution im experimentellen Next-App-Directory-Caller; Patch ab `11.8.0` | Auf mindestens `11.8.0` aktualisieren. Der konkret gemeldete experimentelle Caller wird im Express-Setup nicht verwendet, daher ist der aktuelle praktische Risikograd niedriger als die Paketmeldung. |

## Bedingte oder mittlere Risiken

| Risiko | Evidenz | Empfehlung |
|---|---|---|
| SAML-Host-Header-Abhängigkeit | `server/samlAuthRoutes.ts:37–44` übergibt `req.get("host")` an die SAML-Bibliothek. | Vor Aktivierung von SAML eine feste, konfigurierte öffentliche Portal-URL verwenden; eingehende Host-Header am Reverse Proxy zulassenlisten. |
| SAML-Tokenlaufzeit | `server/samlAuthRoutes.ts:72–82` signiert ein Token mit 365 Tagen, während das Cookie 30 Tage gesetzt wird. | Tokenlaufzeit und Cookie-Laufzeit auf denselben, kurzen Wert vereinheitlichen; Sitzungswiderruf ergänzen. |
| Vertrauensmodell für Reverse Proxy | `server/_core/index.ts:44` setzt `trust proxy` global. Rate Limits und Protokollerkennung nutzen Forwarded-Header. | Nur bekannte Proxy-Netze vertrauen oder Netzwerktopologie erzwingen, in der die Anwendung nicht direkt öffentlich erreichbar ist. |
| CSRF-Verteidigung | Cookies verwenden bei HTTPS `SameSite=None`; ein expliziter CSRF-Token ist nicht sichtbar. | Bei Bedarf Cross-Site-Login begrenzen: `SameSite=Lax` prüfen; für zustandsverändernde direkte Express-Routen Origin-/Referer-Prüfung oder CSRF-Tokens einführen. |
| Ressourcenverbrauch durch Exporte | PDF- und ICS-Endpunkte puffern Objekte im Speicher; globaler API-Limiter erlaubt 600 Anfragen je 15 Minuten pro IP. | Exportendpunkte separat begrenzen, Auftragsgrößen paginieren und ressourcenintensive Erzeugung in einen Job mit Limits verlagern. |
| Bild-Upload | `/api/upload/photo` akzeptiert jedes `image/*`, ohne die vorhandene Dateisignaturprüfung aufzurufen. | Nur erlaubte Rasterformate akzeptieren, Signaturprüfung auch dort erzwingen und Bilder vor Speicherung serverseitig neu kodieren. SVG nicht als nutzergeladenes Profilbild ausliefern. |

## Positiv überprüfte Kontrollen

Die Live-Instanz liefert HSTS mit Preload, CSP, `X-Content-Type-Options: nosniff`, restriktive Frame-Policies sowie eine Referrer-Policy. Der Server setzt Helmet, begrenzt JSON-/Formulargrößen auf 1 MB und begrenzt Authentifizierungsversuche. Mehrere Uploadrouten prüfen Dateisignaturen und begrenzen Dateigrößen. Diese Maßnahmen bleiben wertvoll, ersetzen aber nicht die oben priorisierten Korrekturen.

## Empfohlene Reihenfolge

1. **Sofort:** `dangerouslySetInnerHTML` für Profilinhalte entfernen oder korrekt sanitizen; externe Skriptquellen aus der CSP entfernen.
2. **Sofort:** Private Dokumente aus öffentlichen Storage-Proxys herauslösen; dokumentbezogene Abrufautorisierung einführen.
3. **Sofort:** `respondViaToken` deaktivieren oder atomar, einmalig und aktionsgebunden umbauen; kryptografischen Fallback-Schlüssel entfernen.
4. **Kurzfristig:** Abhängigkeiten aktualisieren und vor allem die XLSX-Importkette isolieren bzw. ersetzen.
5. **Vor SAML-Aktivierung:** feste Canonical-Origin-Konfiguration, Host-Allowlist, einheitliche Tokenlaufzeit und ein fachlicher SAML-Abnahmetest.

## Grenzen der Bewertung

Diese Bewertung bestätigt Code- und Konfigurationsbefunde. Nicht abschließend geprüft wurden Reverse-Proxy-Regeln, Firewall/Netzsegmentierung, S3-/Forge-Bucket-ACLs, Geheimnisrotation, E-Mail-Gateway, Datenbankberechtigungen, Backup-Verschlüsselung, Monitoring/Alarmierung und reale IdP-Parameter. Für einen Freigabeentscheid sollte ein externer, autorisierter Penetrationstest diese Bereiche ergänzen.
