# Prüfung der SAML-Fehlerseite

**Stand:** 14. August 2026

Beim ersten Aufruf der Vorschau-URL `/saml/error?code=saml_account_not_found` wurde zunächst eine leere Ansicht beobachtet. Die anschließende Seitenansicht befand sich auf `/login?returnTo=%2Fsaml%2Ferror`; die Browser-Konsole enthielt keine Meldung.

Die lokalen Netzwerkprotokolle zeigen dabei nicht authentifizierte Abrufe von `notifications.list` mit Status 401. Vor der Auslieferung wird die öffentliche Route deshalb nochmals mit einer frischen Navigation geprüft. Die serverseitigen Unit-Tests der Fehlertexte und der PDF-Erzeugung sind unabhängig davon erfolgreich.
