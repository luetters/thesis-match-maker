## Befunde zum fehlerhaften offiziellen Anmeldedokument

- Quelle: `/home/ubuntu/upload/HTW_Antrag_1230001_Thema_wird_noch_festgelegt.pdf`
- Visuelle Prüfung der Seiten 1 bis 5 am 25.08.2026.
- Das Dokument umfasst derzeit **5 Seiten**, obwohl inhaltlich fast alles auf Seite 1 steht.
- **Seite 1** enthält den eigentlichen Antrag mit Titel, Rahmendaten und Beteiligtenliste.
- **Seite 2** ist fast leer und enthält nur den Text `HTW Berlin – Thesis-Management-System` oben links.
- **Seite 3** ist fast leer und enthält nur `Seite 1 von 1` oben rechts.
- **Seite 4** ist fast leer und enthält nur `Erstellt: 25.08.2026` oben links sowie den **QR-Code unten rechts**.
- **Seite 5** ist fast leer und enthält nur `Thesis-Portal` oben rechts.
- Das **HTW-Berlin-Logo fehlt** im sichtbaren PDF vollständig.
- Schlussfolgerung: Mehrere absolut oder separat platzierte Kopf-/Fuß-/Verifikationsbausteine werden offenbar als eigenständige Druckseiten gerendert statt in ein gemeinsames Einseitenlayout integriert.

Nach einer ersten Footer-Korrektur wurde der reale geschützte Export für Antrag `1230001` lokal erneut ausgelöst. `pdfinfo` meldet weiterhin fünf Seiten. Der verbleibende Fehler liegt daher nicht ausschließlich an der unteren PDFKit-Marge und wird anhand der neu erzeugten Datei weiter eingegrenzt.

Die neue visuelle Prüfung der lokal erzeugten Datei `/tmp/verified-thesis-summary.pdf` zeigt: Seite 1 enthält jetzt das HTW-Berlin-Logo korrekt, aber die einzelnen Footer-Bausteine werden weiterhin auf getrennte Zusatzseiten verteilt. Seite 2 enthält nur `HTW Berlin – Thesis-Management-System`, Seite 3 nur `Seite 1 von 1`, Seite 4 nur `Erstellt: 25.08.2026` plus QR-Code und Seite 5 nur `Verifikation`. Damit liegt die Hauptursache sehr wahrscheinlich in der verketteten Ausgabe mehrerer `text()`-Aufrufe im Footer-/QR-Block der Summary-PDF.

Nach der abschließenden Umstellung, bei der der PDFKit-Inhalt zuerst auf die erste Seite reduziert und Footer sowie QR-Code anschließend mit PDF-Lib direkt auf diese Seite gesetzt werden, liefert der reale geschützte Export für Antrag `1230001` laut `pdfinfo` genau **eine Seite**. Die visuelle Prüfung bestätigt ein sichtbares HTW-Berlin-Logo oben links, einen QR-Code unten rechts sowie einen vollständigen Footer auf derselben Seite.
