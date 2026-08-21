# Befund: Offizieller Sicherungsimport und IONOS-VPS

**Stand:** 21. August 2026  
**Gegenstand:** Zulässiger Umgang mit der offiziellen Aufgabendatensicherung des Thesis Match Maker.

## Verbindliche Feststellungen

Die offizielle Dokumentation beschreibt die Aufgabendatensicherung als verschlüsseltes Sicherungsarchiv für Aufgaben, erzeugte Dateien und Konfiguration. Bei großen Datenmengen wird der Export in einzelne Sicherungspakete von höchstens 4 GB geteilt. Die Sicherung darf nicht umbenannt, verschoben oder verändert werden, weil sie sonst für die Wiederherstellung unbrauchbar werden kann.[1]

Die dokumentierte Wiederherstellung erfolgt ausschließlich über das offizielle Wiederherstellungswerkzeug. Dort wird die Aufgabendatensicherung hochgeladen oder importiert, um Aufgaben und Dateien innerhalb von Manus wiederherzustellen. Die Dokumentation beschreibt keinen direkten Export als MySQL-Dump, kein Dateisystemarchiv für einen eigenen Server und keinen Import der `.manustask`-Pakete in einen externen VPS.[2]

Das vorbereitete IONOS-Werkzeug erwartet dagegen ausdrücklich zwei andere Artefakte: `database.sql.gz` für MySQL und `storage-local.tar.gz` für lokale Dateien. Diese Dateien liegen aus der offiziellen Aufgabendatensicherung derzeit nicht als offiziell dokumentierter, extrahierbarer Import vor.

## Konsequenz für den aktuellen Umzug

1. Die vorhandenen offiziellen Sicherungspakete bleiben unverändert und außerhalb des IONOS-VPS.
2. Der IONOS-VPS bleibt mit gebauter Anwendung und leerer, geprüfter Datenbank vorbereitet.
3. Ein direkter Datenimport auf den VPS darf erst erfolgen, wenn ein offiziell dokumentiertes SQL- und Dateiexportformat oder eine ausdrücklich bestätigte Freigabe durch den Plattform-Support vorliegt.
4. Bis dahin ist die vollständige Wiederherstellung der Sicherung nur innerhalb des offiziellen Wiederherstellungswerkzeugs vorgesehen.

## Nächster zulässiger Schritt

Für die vollständige Wiederherstellung innerhalb von Manus wird ab dem 25. August um 08:00 Uhr SGT das offizielle Wiederherstellungswerkzeug verwendet. Der bestehende IONOS-VPS bleibt dabei unberührt, bis ein externer Exportweg bestätigt wurde.[2]

Für eine Übernahme auf den IONOS-VPS ist beim Support über [help.manus.im](https://help.manus.im) folgende Auskunft einzuholen:

> Wir betreiben den Thesis Match Maker künftig auf einem eigenen IONOS-VPS. Für den vorbereiteten Restore benötigen wir einen vollständigen, autorisierten Export der Datenbank als MySQL-kompatiblen Dump sowie der gespeicherten Dateien als Archiv oder S3-Export. Liegt für unsere offizielle Aufgabendatensicherung ein dokumentierter externer Exportweg vor? Falls ja, teilen Sie uns bitte das bestätigte Format, die Integritätsprüfung und den empfohlenen Ablauf mit. Wir werden die Sicherung nicht verändern oder eigenständig entpacken.

Ohne eine solche Bestätigung gibt es keinen zulässigen direkten Import der `.manustask`-Pakete in MySQL oder den lokalen Dateispeicher des VPS.

## Quellen

[1] [Manus Help Center: How to Back Up Your Data](https://help.manus.im/en/articles/16147892-service-change-overview-how-to-back-up-your-data)  
[2] [Manus Help Center: How to Restore Your Data](https://help.manus.im/en/articles/16147895-service-change-overview-how-to-restore-your-data)
