# 2FAS-kompatible Zwei-Faktor-Authentifizierung

Die optionalen zweiten Faktoren für Administrationskonten werden über den offenen TOTP-Standard umgesetzt. 2FAS bestätigt selbst, dass seine Authenticator-App RFC 6238 (TOTP) verwendet und deshalb mit Anwendungen funktioniert, die TOTP oder HOTP unterstützen.[1]

Die Implementierung verwendet pro Konto einen kryptographisch zufällig erzeugten Geheimschlüssel, einen 30-Sekunden-Zeitschritt, sechsstellige Codes und eine eng begrenzte Zeittoleranz. RFC 6238 empfiehlt einen 30-Sekunden-Schritt sowie höchstens einen zusätzlichen Zeitschritt für Netzwerkverzögerungen; außerdem sollen Geheimschlüssel pro Nutzer:in eindeutig und mit kryptographisch sicherer Zufallsquelle erzeugt werden.[2]

## Quellen

[1] 2FAS, *Can I use 2FAS Auth on my own website or app?* https://2fas.com/support/2fas-auth-mobile-app/can-i-use-2fas-on-my-own-website-or-app/

[2] IETF, *RFC 6238 — TOTP: Time-Based One-Time Password Algorithm.* https://datatracker.ietf.org/doc/html/rfc6238
