# VPS-Sprachdiagnose

## Beobachtung am 26. August 2026

Die öffentliche Domain `https://thesismatch.online/` lieferte im externen Browser den Seitentitel **„Thesis-Management HTW Berlin“**, zeigte jedoch eine vollständig leere Seite ohne erkennbare interaktive Elemente. Die Browserkonsole enthielt in dieser Prüfung keine Meldungen.

Dieser Befund erlaubt keine Aussage über einzelne Übersetzungen, weil die clientseitige Oberfläche insgesamt nicht gerendert wird. Vor einer Sprachprüfung müssen auf dem VPS daher die ausgelieferte HTML-Hülle, die referenzierten JavaScript-/CSS-Assets sowie die Caddy-/Container-Auslieferung abgeglichen werden.

> Der Befund wurde nur lesend erhoben. Es wurden keine Domain-, DNS-, Container- oder Datenänderungen ausgelöst.

## Nachprüfung der Sprachumschaltung

Eine wiederholte Prüfung derselben VPS-Domain ergab anschließend eine vollständig gerenderte Startseite. Der Umschalter `EN` stellte die gesamte öffentliche Startseite auf Englisch um und setzte die sichtbare Anzeige auf **„Active language: English“**. Die englische Präferenz blieb beim Aufruf der Anmeldeseite erhalten; auch dort wurden die öffentlichen Inhalte auf Englisch ausgegeben.

Der Sprachumschalter ist damit auf nicht angemeldeten öffentlichen Seiten der VPS-Ausgabe funktionsfähig. Der gemeldete Fehler betrifft wahrscheinlich eine angemeldete Fachansicht, eine unvollständig übersetzte einzelne Komponente oder eine lokale Browser-/Profilsituation. Für eine gezielte Korrektur werden die betroffene Rolle, die URL und idealerweise ein Screenshot der konkreten Ansicht benötigt.
