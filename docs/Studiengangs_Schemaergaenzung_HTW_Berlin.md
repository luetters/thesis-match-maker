# Fehlende Studiengangstabellen auf `thesis.f3.htw-berlin.de` ergänzen

Diese Anleitung ist nur für den Fall gedacht, dass die bestehende Datenbank die Tabelle `programmes` noch nicht enthält. Das Werkzeug ergänzt die fehlenden technischen Tabellen **additiv**.

> Es werden keine vorhandenen Daten, Konten, Anträge, Dateien, Rollen oder Einstellungen gelöscht. Vor jeder Änderung wird eine vollständige Datenbank- und Dateisicherung mit Prüfsummen erzeugt und geprüft. Es werden keine historischen Drizzle-Migrationen und keine direkten SQL-Befehle aus dem Chat verwendet.

## Was ergänzt wird

| Bereich | Tabellen bzw. Felder |
|---|---|
| Studiengangsstammdaten | `programmes` |
| Fachliche Zuordnungen | `examiner_programmes`, `pav_programmes`, `users.programme_id` |
| Öffentliche Studiengangsinhalte | `programme_content_managers`, `programme_public_links` |
| Studiengangsfristen | `programme_semester_deadlines` |

Die Tabellen werden nur angelegt, wenn sie fehlen. Bereits vorhandene Tabellen und Datensätze bleiben unverändert.

## 1. Einzelnes Werkzeug auf den Server übertragen

Laden Sie ausschließlich diese Datei per FileZilla nach `/root/` auf den Server hoch:

```text
repair-programme-schema.sh
```

Anschließend per SSH:

```bash
sudo install -o root -g root -m 750 \
  /root/repair-programme-schema.sh \
  /opt/thesis-match-maker/scripts/selfhosted/repair-programme-schema.sh
```

## 2. Ausschließlich lesende Vorprüfung

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-programme-schema.sh --check
```

Erwartung bei dem beschriebenen Problem: In der Tabellenübersicht fehlt `programmes`. Dieser Schritt ändert nichts.

Brechen Sie ab, wenn der Datenbankcontainer nicht läuft, eine falsche Datenbank angezeigt wird oder die Tabellen bereits vorhanden sind.

## 3. Additive Ergänzung mit Backup

Nur wenn die Vorprüfung die fehlenden Tabellen bestätigt, führen Sie aus:

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-programme-schema.sh \
  --apply \
  --confirm STUDIENGANG_SCHEMA_NACH_BACKUP
```

Das Werkzeug erzeugt automatisch eine Sicherung unter:

```text
/opt/thesis-match-maker/backups/programme-schema-repair-<UTC-Zeitstempel>
```

## 4. Nachkontrolle und Datenimport

Nach der Erfolgsmeldung erneut rein lesend prüfen:

```bash
cd /opt/thesis-match-maker
sudo scripts/selfhosted/repair-programme-schema.sh --check
```

Danach im Portal als Superadmin:

1. **Datenübernahme** öffnen.
2. Das bereits exportierte Transfer-ZIP auswählen.
3. **Archiv prüfen** ausführen.
4. Erst wenn die Vorschau gültig ist, Importschlüssel eingeben, `IMPORTIEREN` bestätigen und den finalen Import bewusst auslösen.

> Den Importschlüssel niemals im Chat, in Screenshots oder per E-Mail teilen.
