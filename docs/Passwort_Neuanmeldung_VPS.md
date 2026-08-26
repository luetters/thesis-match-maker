# Einmalige Passwort-Neuanmeldung auf dem IONOS-VPS

Die Passwort-Neuanmeldung wird erst nach dem nächsten kontrollierten Release auf dem IONOS-VPS ausgeführt. Sie ist eine **manuelle Superadmin-Aktion**; ein automatischer Versand ist nicht vorgesehen.

## Voraussetzungen

| Prüfschritt | Erwartung | Abbruch bei Abweichung |
|---|---|---|
| Release | Der aktuelle Release enthält die Funktion „Passwort-Neuanmeldung senden“. | Kein Versand; erst den kontrollierten FileZilla-Deploy abschließen. |
| Login | Ein Superadmin kann die Nutzerverwaltung öffnen. | Kein Versand; Superadmin-Zugang prüfen. |
| Zielgruppe | Die Vorschau enthält jede freigegebene E-Mail-Adresse genau einmal. | Kein Versand; doppelte oder fehlende Konten zuerst analysieren. |
| URL | Die Vorschau verwendet die produktive VPS-/Portal-URL. | Kein Versand; keine Reset-Links für Vorschau- oder Entwicklungsdomains erzeugen. |
| SMTP | Der Einzeltest war erfolgreich. | Kein Versand; SMTP auf dem VPS prüfen. |

## Kontrollierter Ablauf

1. Melden Sie sich als **Superadmin** am aktuellen VPS-Portal an und öffnen Sie die Nutzerverwaltung.
2. Wählen Sie **„Passwort-Neuanmeldung senden“**. Die Funktion ist für Verwaltungskonten nicht sichtbar und serverseitig zusätzlich auf Superadmins beschränkt.
3. Prüfen Sie die angezeigte Anzahl und die Liste der Zielkonten. Die Ansicht gruppiert nach E-Mail-Adresse; historische Dubletten können daher keinen doppelten Versand erzeugen.
4. Brechen Sie ab, wenn die Zahl nicht zu den bekannten freigegebenen Nutzer:innen passt oder unerwartete Adressen erscheinen.
5. Geben Sie exakt `PASSWORT-NEUANMELDUNG` ein und bestätigen Sie zusätzlich die geprüfte Zielgruppe.
6. Erst danach wird der Versand ausgelöst. Jeder Link ist 48 Stunden gültig; E-Mails enthalten keine Passwörter oder Tokens im sichtbaren Text.
7. Prüfen Sie anschließend den Audit-Eintrag `SUPERADMIN_PASSWORD_RENEWAL_SENT` mit Anzahl erfolgreicher und fehlgeschlagener Zustellungen.

## Zugriffsfall `holger.luetters@htw-berlin.de`

Im importierten Projektstand ist dieses Konto als freigegebene Erstprüfung mit einer hinterlegten Passwort-Hash vorhanden. Der historische Kennzeichner `magic_link` verhindert den Passwort-Login im aktuellen Code nicht. Die konkrete Ursache eines fehlgeschlagenen Logins kann jedoch ausschließlich mit dem **VPS-Login-Protokoll** festgestellt werden, weil die produktive Passwort-Hash und die dortigen fehlgeschlagenen Anmeldeversuche nicht in der Entwicklungsumgebung geprüft werden dürfen.

Die einmalige Passwort-Neuanmeldung schließt die Adresse ein, sofern sie auf dem VPS freigegeben ist. Dadurch erhält die Person einen neuen, produktiven Link zur Vergabe eines persönlichen Portalpassworts.

> **Sicherheitshinweis:** Das Portal ist kein offizielles HTW-Berlin-Login. Empfänger:innen dürfen niemals ihr echtes HTW-Berlin-Passwort als Portalpasswort verwenden.
