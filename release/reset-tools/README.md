# Reset-Werkzeuge für `thesis.f3.htw-berlin.de`

Dieses Paket ergänzt ausschließlich die Werkzeuge für die datenbewahrende Schema-Reparatur sowie den bestätigten Nutzer- und Vorgangsreset mit neuem Superadmin. Es ersetzt weder die geschützte Datei `deploy/.env` noch Docker-Volumes, Datenbank-, SMTP-, Domain- oder Caddy-Einstellungen.

## 1. Upload mit FileZilla

1. Laden Sie die Datei `thesis-reset-superadmin-htw-berlin-20260925.zip` herunter.
2. Öffnen Sie FileZilla und verbinden Sie sich mit dem HTW-Berlin-Server als administrativer Servernutzer.
3. Laden Sie die ZIP-Datei in den Ordner `/root/` hoch. Verwenden Sie keinen bestehenden Deploy- oder Releaseordner.
4. Warten Sie, bis FileZilla den Upload als erfolgreich anzeigt.

## 2. Installation im SSH-Fenster

Melden Sie sich per SSH am Server an und führen Sie diese Befehle **einzeln** aus:

```bash
sudo rm -rf /tmp/thesis-reset-tools
```

```bash
sudo mkdir -p /tmp/thesis-reset-tools
```

```bash
sudo unzip -q -o /root/thesis-reset-superadmin-htw-berlin-20260925.zip -d /tmp/thesis-reset-tools
```

```bash
sudo /tmp/thesis-reset-tools/install-reset-tools.sh
```

Der letzte Befehl baut nur den App-Container mit den neuen Werkzeugen neu. Er ändert weder Datenbankdaten noch `deploy/.env`.

## 3. Nur Vorschau – noch kein Löschen

Nach erfolgreicher Installation folgt zunächst ausschließlich der lesende Schema-Check:

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-auth-schema.sh --check
```

Die Ausgabe darf keine Passwörter, SMTP-Zugangsdaten, Token oder den Inhalt von `deploy/.env` enthalten. Senden Sie nur die Tabellen- und Spaltenübersicht zurück.

Erst nach dem Check werden der additive Schemaabgleich und danach der doppelt bestätigte Nutzer- und Vorgangsreset ausgeführt. Beide Schritte werden nicht durch den Installer ausgelöst.
