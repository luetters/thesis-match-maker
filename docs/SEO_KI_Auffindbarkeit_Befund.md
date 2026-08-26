# SEO- und KI-Auffindbarkeit des Thesis Match Maker

**Stand:** 26. August 2026  
**Geltungsbereich:** Ausschließlich öffentliche, datensparsame Portalbereiche. Interne Dashboards, Authentifizierung, Passwort-Reset, Einzelfallseiten, Dokumentverifikation und personenbezogene Fallakten dürfen nicht indexiert werden.

## Ausgangslage

Das Portal liefert seine React-Anwendung als Single-Page-Application aus. Öffentliche Inhalte bestehen insbesondere aus der Startseite, FAQ, dem Prüfer:innen-Verzeichnis, freigegebenen Abstracts sowie der neuen Studiengangsübersicht und ihren Detailseiten. Derzeit enthält die statische HTML-Einstiegsdatei nur einen allgemeinen Titel und eine allgemeine Beschreibung. Eine `robots.txt` oder XML-Sitemap ist nicht vorhanden.

| Befund | Bedeutung | Priorität |
|---|---|---|
| Kein `robots.txt` und keine Sitemap | Crawler erhalten keine klare Vorgabe, welche öffentlichen URLs relevant sind und welche Bereiche ausgeschlossen bleiben müssen. | Hoch |
| Allgemeine statt seitenspezifische Metadaten | Studiengangs-, FAQ- und Abstractseiten können nicht mit eindeutigen Suchergebnis-Titeln und Beschreibungen erscheinen. | Hoch |
| Keine kanonische Produktionsdomain im Markup | Vor dem Go-live darf keine Manus-Vorschau als kanonische Quelle signalisiert werden; nach dem Go-live ist `https://thesismatch.online` eindeutig zu setzen. | Hoch |
| Keine strukturierte Auszeichnung | Die sichtbaren öffentlichen Inhalte liefern Suchsystemen keine expliziten, standardisierten Hinweise zu Organisation, Website, Studiengang und FAQ. | Mittel |
| Öffentliche Routen benötigen klare Datenminimierung | Nur veröffentlichte Studiengangsinhalte, freigegebene Abstracts und bewusst öffentliche Prüfer:innenprofile dürfen in Sitemap, Metadaten oder strukturierten Daten erscheinen. | Hoch |

## Fachliche Leitlinien

Google empfiehlt keine besondere „KI-SEO“ oder spezielle KI-Datei für die Einbeziehung in AI Overviews bzw. AI Mode. Entscheidend sind die normalen technischen Suchvoraussetzungen, hilfreiche menschenorientierte Inhalte, interne Verlinkung, sichtbarer Text und strukturierte Daten, die exakt zum sichtbaren Seiteninhalt passen.[1] Suchmaschinen finden Inhalte außerdem über Links und Sitemaps; klare URLs, eindeutige Seitentitel und präzise Beschreibungen helfen dabei, Zweck und Relevanz der Seite zu verstehen.[2]

> „There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary.“ [1]

Für strukturierte Daten soll JSON-LD verwendet werden. Die Auszeichnung muss die tatsächlich sichtbaren Inhalte der jeweiligen Seite beschreiben; leere Schema-Seiten oder unsichtbare Angaben sind nicht zulässig.[3]

## Empfohlene Umsetzung in Prioritätsreihenfolge

| Priorität | Maßnahme | Konkrete Anwendung im Portal | Datenschutz- und Qualitätsgrenze |
|---|---|---|---|
| 1 | Produktionsdomain und Canonical-Strategie | Nach DNS-Freigabe jede öffentliche Seite auf `https://thesismatch.online` kanonisieren; Vorschau-Domains erhalten keine produktive Canonical-Adresse. | Erst nach echter Domainaktivierung setzen. |
| 1 | Indexierungsregeln | `robots.txt` und route-spezifische `noindex`-Regeln einführen. Indexierbar: Startseite, FAQ, Prüfer:innenverzeichnis, bewusst öffentliche Profile, veröffentlichte Abstracts und Studiengangsseiten. | Ausschließen: Login, Dashboards, Profileinstellungen, Reset, Antrags- und Prüfungsfälle, Dokumentverifikation, E-Mail-Aktionsseiten. |
| 1 | XML-Sitemap | Dynamische Sitemap nur aus veröffentlichten, öffentlichen Datensätzen erzeugen; nach Go-live in Google Search Console und Bing Webmaster Tools einreichen. | Keine Nutzer-IDs, Token-URLs, nicht veröffentlichte Studiengänge oder Sperrvermerkfälle aufnehmen. |
| 1 | Seitenspezifische Meta-Tags | Für jede öffentliche Route Titel, Description, Canonical und Open-Graph-Daten aus den sichtbaren Inhalten erzeugen. | Keine Personen-E-Mail-Adressen, Matrikelnummern, Fristen einzelner Fälle oder interne Statusdaten in Beschreibungen. |
| 2 | Strukturierte Daten | `Organization`/`EducationalOrganization` und `WebSite` auf der Startseite; `FAQPage` auf der FAQ-Seite; `BreadcrumbList` für Studiengangsdetails; `EducationalOccupationalProgram` nur mit verifizierten Studiengangsinformationen. | Markup muss vollständig, korrekt und sichtbar sein; keine erfundenen Kurs-, Kontakt- oder Bewertungsdaten. |
| 2 | Inhaltsstruktur | Studiengangsseiten mit klarer Einleitung, Fachbereich, Abschlussarten, Zielgruppe, Beratungs-/Informationslinks, Aktualisierungsdatum und gutem Linktext pflegen. | Externe Links sind redaktionell geprüft; bei nicht kontrollierten Zielseiten `rel="nofollow noopener noreferrer"` nutzen. |
| 2 | Sprachsignale | Deutsche und englische öffentliche Seiten mit korrektem `lang`, eindeutigen Übersetzungen und, soweit dieselben Inhalte verfügbar sind, `hreflang`-Verweisen ausstatten. | Keine scheinbaren Übersetzungen erzeugen, wenn ein Inhalt nur in einer Sprache gepflegt ist. |
| 3 | Monitoring | Search Console, Bing Webmaster Tools, Sitemap-Status, Indexabdeckung, Core Web Vitals und Suchanfragen regelmäßig prüfen. | Erst nach dem späteren DNS-/Go-live-Schritt möglich. |

## Nächste technische Lieferung

Die erste sichere Implementierungsstufe umfasst eine datensparsame `robots.txt`, eine dynamische Sitemap ausschließlich für freigegebene öffentliche Inhalte, zentrale Helfer für Canonical-/Meta-Tags und JSON-LD für Startseite, FAQ und Studiengangsseiten. Der tatsächliche Domainwert wird konfigurierbar gehalten und erst bei der späteren öffentlichen Domainaktivierung auf `thesismatch.online` gesetzt.

## Quellen

[1] [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)  
[2] [Google Search Central: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)  
[3] [Google Search Central: Introduction to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)  
[4] [Schema.org: Organization](https://schema.org/Organization)
