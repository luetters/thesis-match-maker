# Superadmin-Erstzugang auf dem HTW-Berlin-Server

Diese Anleitung richtet sich ausschließlich an die zuständige Serveradministration. Sie beschreibt den kontrollierten Zugang zu einer **neuen oder umgezogenen** Installation des Thesis Match Maker, wenn noch kein Superadmin-Konto vorhanden oder das vorhandene Konto nicht mehr nutzbar ist.

> **Sicherheitsgrundsatz:** Das Portal verwendet E-Mail-Adresse und ein eigenes Portalpasswort. Es gibt keinen externen Authentifizierungsdienst. Kennwörter, Passwort-Hashes, Zwei-Faktor-Geheimnisse, SMTP-Daten, Tokens und die Datei `deploy/.env` dürfen niemals in Chatnachrichten, Tickets, Git oder Screenshots gelangen. Nutzende verwenden niemals ihr HTW-Berlin-Passwort.

## 1. Zuerst nur den Kontostatus prüfen

Die Administration führt auf dem Ubuntu-Server den folgenden rein lesenden Befehl aus. Er zeigt ausschließlich technische Zustände und minimierte Kontometadaten, aber weder Zugangsdaten noch Geheimnisse.

```bash
cd /opt/thesis-match-maker
sudo chmod 750 scripts/selfhosted/verify-server-readonly.sh
sudo scripts/selfhosted/verify-server-readonly.sh \
  --account-email holger@luetters.net
```

| Ergebnis | Zulässiger nächster Schritt |
|---|---|
| Kein Datensatz | Einmaliger, lokaler Erstzugang gemäß Abschnitt 2. |
| Genau ein Datensatz, Passwort vorhanden, Status `approved` | Regulär über `https://thesis.f3.htw-berlin.de/login` anmelden. |
| Genau ein Datensatz, aber kein Passwort oder Status nicht `approved` | Kontrollierte Wiederherstellung gemäß Abschnitt 3. |
| Mehrere Datensätze | **Nicht** fortfahren. Dubletten und einen eventuell fehlenden Datenimport fachlich klären. |
| Container oder HTTP-Check nicht gesund | **Nicht** fortfahren. Zuerst den Betriebsfehler beheben. |

Für eine abweichende, von der HTW Berlin bestimmte Superadmin-E-Mail-Adresse wird dieselbe Prüfung mit dieser Adresse ausgeführt.

## 2. Einmaliger Erstzugang bei leerer Benutzerbasis

Nur wenn der lesende Check keinen Datensatz ausweist, führt die Administration den Erstzugang aus. Das Werkzeug verlangt eine sichtbare Bestätigung und fragt das neue Passwort zweimal **verdeckt** im Terminal ab. Es legt nur dieses eine Konto an, setzt die Rolle auf `superadmin`, protokolliert den Vorgang im Audit-Log und verändert weder E-Mail-Versand, DNS, Firewall, Datenstruktur noch weitere Konten.

```bash
cd /opt/thesis-match-maker
sudo chmod 750 scripts/selfhosted/bootstrap-superadmin.sh
sudo scripts/selfhosted/bootstrap-superadmin.sh \
  --mode initial \
  --email holger@luetters.net \
  --name "Holger Lütters"
```

Bei der Aufforderung wird exakt `SUPERADMIN_ERSTZUGANG` eingegeben. Das Passwort muss mindestens 12 Zeichen umfassen und Zeichen aus mindestens drei Gruppen enthalten: Kleinbuchstaben, Großbuchstaben, Ziffern und Sonderzeichen.

Nach der Erfolgsmeldung erfolgt die Anmeldung ausschließlich über die normale Anmeldeseite des Portals. Das Passwort wird nicht angezeigt, versendet oder in einem Befehl gespeichert.

## 3. Wiederherstellung eines vorhandenen Superadmin-Kontos

Wenn genau ein Konto mit der vorgesehenen E-Mail-Adresse existiert, kann die Administration das Passwort lokal neu setzen und den Kontostatus wieder auf `approved` setzen. Der Modus `recover` legt dabei kein zweites Konto an.

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/bootstrap-superadmin.sh \
  --mode recover \
  --email holger@luetters.net \
  --name "Holger Lütters"
```

Die Zwei-Faktor-Authentifizierung bleibt dabei unverändert. Ist zusätzlich der zweite Faktor verloren gegangen, darf er nur nach der Identitätsprüfung durch die zuständige HTW-Berlin-Administration zurückgesetzt werden:

```bash
sudo scripts/selfhosted/bootstrap-superadmin.sh \
  --mode recover \
  --email holger@luetters.net \
  --name "Holger Lütters" \
  --reset-two-factor
```

Dieser Zusatzschritt verlangt eine zweite ausdrückliche Terminalbestätigung (`2FA_ZURUECKSETZEN`) und entfernt ausschließlich die bisherige Zwei-Faktor-Konfiguration sowie deren Wiederherstellungscodes für dieses Konto. Anschließend wird die Zwei-Faktor-Authentifizierung im Portal neu eingerichtet.

## 4. Grenzen und Dokumentation

Das Werkzeug verweigert die Ausführung bei mehreren Konten derselben E-Mail-Adresse, bei fehlendem Anwendungscontainer, bei einer unvollständigen Konfiguration oder bei unzureichender Passwortstärke. Es ist kein Ersatz für einen Datenimport: Wenn die erwarteten Nutzer- und Fachprozessdaten fehlen, muss zuerst die freigegebene Datenübernahme oder Wiederherstellung aus einem Backup geklärt werden.

Die Administration dokumentiert außerhalb des Portals nur Datum, verantwortliche Person, E-Mail-Adresse des bearbeiteten Kontos, gewählten Modus und die erfolgreiche Anmeldung. Kennwörter, Tokens, Hashes und Werte aus `deploy/.env` gehören nicht in diese Dokumentation.

## 5. Weiterer Betrieb

Der Erstzugang ist unabhängig vom künftigen Deployment. Die technische Bereitstellung bleibt auf den manuellen GitHub-Actions-Workflow aus [GitHub_Ubuntu_Deploy.md](./GitHub_Ubuntu_Deploy.md) begrenzt. Servergeheimnisse verbleiben im GitHub-Environment und auf dem HTW-Berlin-Server; der eingeschränkte Nutzer `thesis-deploy` besitzt keine interaktive Root-Shell.
