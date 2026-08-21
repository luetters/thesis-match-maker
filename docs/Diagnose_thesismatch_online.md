# Diagnose: externe Domain `thesismatch.online`

## Beobachtung

Am 21. August 2026 wurde die Domain `https://thesismatch.online/` geprüft. Der Server liefert bereits an der Startadresse eine HTTP-Fehlerseite mit dem Seitentitel **„403 Forbidden“** und dem Text:

> Forbidden — You don't have permission to access this resource.

Die Antwort wird vor dem Laden der Thesis-Match-Maker-Anwendung erzeugt. Es erscheinen weder die React-Anwendung noch deren eigene Fehlerseite oder statische Assets.

## Vorläufige Einordnung

Die Ursache liegt daher mit hoher Wahrscheinlichkeit in der externen Hosting- oder Webserverkonfiguration, nicht im React-Frontend: typischerweise ein fehlendes oder nicht lesbares Dokumentenverzeichnis, eine falsche Dokumentwurzel, eine Deny-Regel, fehlende Leserechte oder eine nicht korrekt eingerichtete Weiterleitung für eine Single-Page-Application.

## Prüfpfad

1. HTTP-Antwortkopf und Serverkennung erfassen.
2. Dokumentwurzel und Dateiberechtigungen des externen Webservers prüfen.
3. Sicherstellen, dass der gebaute Web-Client an der konfigurierten Dokumentwurzel liegt.
4. Für SPA-Routen eine Fallback-Weiterleitung auf `index.html` konfigurieren.
5. Falls dieses Full-Stack-Projekt extern betrieben wird: Node/Express-Prozess, Reverse Proxy und die erforderlichen Umgebungsvariablen getrennt prüfen.
