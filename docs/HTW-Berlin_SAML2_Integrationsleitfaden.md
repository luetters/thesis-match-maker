# Optionale SAML-2.0-Anbindung an den Web Login der HTW Berlin

**System:** Thesis Match Maker der HTW Berlin  
**Stand:** 14. August 2026  
**Zielgruppe:** Identity Management, IT-Sicherheit, Anwendungsbetrieb und Datenschutz der HTW Berlin  
**Autor:** Manus AI

## 1. Zweck und Entscheidungsrahmen

Der Thesis Match Maker soll die zentrale Anmeldung der HTW Berlin künftig **zusätzlich** zur bestehenden lokalen Anmeldung mit E-Mail-Adresse und einem eigenständigen Portalpasswort unterstützen. Die lokale Anmeldung wird weder ersetzt noch abgeschaltet. Die SAML-Anmeldung wird erst sichtbar und nutzbar, nachdem die HTW Berlin die erforderlichen Daten bereitgestellt hat, die technische Abnahme erfolgt ist und ein Superadmin sie ausdrücklich aktiviert.

> Der angegebene Link zum Web Login der HTW Berlin ist eine sitzungsgebundene SSO-URL. Er kann nicht als dauerhafte technische Konfiguration übernommen werden; beim direkten Aufruf liefert er erwartungsgemäß eine „Stale Request“-Seite. Benötigt werden stattdessen die verbindlichen **IdP-Metadaten** oder die darin enthaltenen Konfigurationswerte.

SAML-Metadaten beschreiben insbesondere eindeutige Kennungen, Endpunkte, Bindings, Zertifikate und Schlüssel der beteiligten Identitäts- und Service-Provider. [1] Für einen Service Provider sind mindestens eine eindeutige `EntityID` und ein oder mehrere Assertion-Consumer-Service-Endpunkte (ACS) erforderlich. [2]

## 2. Bereits im Portal vorbereitet

| Baustein | Umsetzung im Thesis Match Maker | Aktivierungszustand |
|---|---|---|
| Optionale Anmeldung | Zusätzliche Schaltfläche „Mit HTW Berlin Web Login anmelden“ auf der Login-Seite | Standardmäßig deaktiviert |
| SAML-Endpunkte | Login-Start, ACS und Service-Provider-Metadaten sind vorbereitet | Ohne IdP-Daten nicht nutzbar |
| Sichere Antwortprüfung | Signierte SAML-Responses und Assertions werden verlangt; AuthnRequest und Antwort werden zeitlich korreliert | Bei Aktivierung wirksam |
| Kontozuordnung | Zunächst über eine vorhandene lokale E-Mail-Adresse; danach über die gespeicherte Kombination aus IdP-Entity-ID und persistentem Subject | Keine automatische Kontoanlage |
| Rollen und Freigaben | Bestehende Rollen, Fachbereichsrechte und Freigabestatus bleiben unverändert gültig | Keine Änderung erforderlich |
| Administration | Neue Superadmin-Seite „SAML-Anmeldung“ zur Hinterlegung, Prüfung und Aktivierung der Angaben | Bereitgestellt |

Die Zuordnung über eine bestehende Person vermeidet, dass eine erfolgreiche Hochschulanmeldung unkontrolliert neue Portalrollen erzeugt. Neue Personen durchlaufen weiterhin die Registrierung und die bestehenden Freigabeprozesse.

## 3. Angaben des Thesis Match Makers an die HTW Berlin

Bitte verwenden Sie für die Produktivumgebung die folgenden Angaben. Die Metadaten-URL kann bereits vor Abschluss der IdP-Konfiguration an die HTW Berlin übermittelt werden.

| Parameter | Produktivwert | Bedeutung |
|---|---|---|
| Service-Provider-Entity-ID | `https://thesis.htw-berlin.com/saml/metadata` | Dauerhafte, eindeutige Kennung des Portals |
| SP-Metadaten | `https://thesis.htw-berlin.com/api/auth/saml/metadata` | Maschinenlesbare SAML-Metadaten des Portals |
| Assertion Consumer Service (ACS) | `https://thesis.htw-berlin.com/api/auth/saml/acs` | Zieladresse für die SAML-Response des Identity Providers |
| Erwartete Response-Bindung | SAML 2.0 HTTP-POST | Übertragungsweg vom Identity Provider an den ACS |
| Start der Anmeldung | `https://thesis.htw-berlin.com/api/auth/saml/login` | SP-initiierter Einstieg; optional mit `returnTo=/zielpfad` |
| Single Logout | Nicht Bestandteil der ersten Ausbaustufe | Lokales Abmelden bleibt verfügbar |

Die Service-Provider-Entity-ID muss dauerhaft stabil bleiben; eine Änderung würde eine erneute Registrierung beim Identity Provider erforderlich machen. Die ACS-URL und die Entity-ID müssen ausschließlich per HTTPS erreichbar sein.

## 4. Von der HTW Berlin benötigte Informationen und Einrichtungen

### 4.1 Pflichtlieferumfang des Identity Managements

Die HTW Berlin stellt bitte für **Test/Staging** und **Produktion getrennt** die folgenden Informationen bereit. Eine signierte XML-Metadatendatei oder eine HTTPS-Metadaten-URL ist dem manuellen Übertragen einzelner Werte vorzuziehen.

| Erforderlich | Konkret benötigt | Zweck im Portal |
|---|---|---|
| Ja | IdP-Metadaten-URL oder signierte XML-Metadatendatei | Vertrauensanker; enthält Entity-ID, SSO-Endpunkte und Zertifikate |
| Ja | IdP-Entity-ID | Verbindliche Identifikation des HTW-Berlin-Identity-Providers |
| Ja | SSO-Endpunkt einschließlich unterstütztem Binding | Weiterleitung der AuthnRequests an den Web Login; bevorzugt HTTP-Redirect oder nach Angabe der Metadaten |
| Ja | Aktuelles X.509-Signaturzertifikat des IdP einschließlich Ablaufdatum | Prüfung der Signatur eingehender SAML-Responses und Assertions |
| Ja | Attributfreigabe für `NameID` und `mail` | Stabile Identitätszuordnung und Abgleich mit einem bestehenden Portalkonto |
| Empfohlen | `givenName` und `sn` | Plausibilitätsanzeige und gegebenenfalls spätere Pflege der Namensfelder |
| Empfohlen | Verfahren für Zertifikatsrotation und technische Kontaktstelle | Vermeidet Ausfälle beim IdP-Zertifikatswechsel |
| Empfohlen | Testkonten oder ein abgestimmtes Testszenario | Nachweis der Ende-zu-Ende-Funktion vor Produktivschaltung |

Das IdP-Zertifikat ist ein **öffentliches Signaturzertifikat**, kein privater Schlüssel. Private Schlüssel oder Passwörter der HTW Berlin werden nicht benötigt und dürfen nicht an das Projektteam übermittelt werden.

### 4.2 Registrierung des Service Providers bei der HTW Berlin

Die zuständige Stelle registriert den Thesis Match Maker als SAML-2.0-Service-Provider und hinterlegt die Werte aus Abschnitt 3. Sofern der Prozess der HTW Berlin dies vorsieht, reicht das Projektteam die SP-Metadaten-URL oder die daraus abgerufene XML-Datei ein. Eine typische Hochschul-SAML-Integration umfasst die Festlegung der benötigten Attribute, die Registrierung der Anwendung und die Konfiguration des Service Providers. [3]

Bitte bestätigen Sie bei der Registrierung ausdrücklich:

1. Die Audience bzw. Service-Provider-Entity-ID entspricht exakt `https://thesis.htw-berlin.com/saml/metadata`.
2. Die ACS-URL entspricht exakt `https://thesis.htw-berlin.com/api/auth/saml/acs`.
3. SAML-Response **und** Assertion werden signiert ausgeliefert.
4. Der `NameID` ist persistent und nicht leer. Ein pseudonymer persistenter Identifier ist ausreichend; eine Matrikelnummer oder Personalnummer wird nicht benötigt.
5. Das Attribut `mail` enthält die dienstliche oder studentische E-Mail-Adresse, die mit der bei der Portalregistrierung verwendeten Adresse übereinstimmt.

## 5. Attributvereinbarung

Die erste Ausbaustufe arbeitet datensparsam. Für die technische Anmeldung und die sichere Kontozuordnung genügt ein persistenter Subject-Identifier sowie die E-Mail-Adresse.

| Fachliche Information | Bevorzugtes SAML-Attribut | Status | Verarbeitung im Portal |
|---|---|---|---|
| Persistente IdP-Identität | `NameID` | Pflicht | Wird gemeinsam mit der IdP-Entity-ID zur dauerhaften technischen Zuordnung gespeichert |
| E-Mail-Adresse | `mail` | Pflicht | Abgleich mit einem bereits vorhandenen lokalen Portalkonto; nicht vorhandene Konten werden nicht automatisch erzeugt |
| Vorname | `givenName` | Empfohlen | Für spätere, kontrollierte Profilpflege vorgesehen |
| Nachname | `sn` | Empfohlen | Für spätere, kontrollierte Profilpflege vorgesehen |

Falls die HTW Berlin andere Attributnamen oder OID-URIs verwendet, können sie auf der Superadmin-Seite konfiguriert werden. Die Freigabe zusätzlicher Attribute, insbesondere Matrikelnummer, Personalnummer, Organisationseinheit oder Gruppen, ist **nicht** Bestandteil dieser ersten Anbindung und erfordert eine eigene Zweck- und Berechtigungsprüfung.

## 6. Sicherheits- und Betriebsanforderungen

Die Konfiguration verlangt HTTPS für Entity-ID, ACS und IdP-SSO-Endpunkt. SAML-Metadaten können Zertifikate, Signaturen und vertrauensbildende Informationen enthalten. [1] Der Identity Provider soll deshalb mindestens die folgenden Einstellungen verwenden:

| Bereich | Erwartung |
|---|---|
| Signaturen | Signierte SAML-Response und signierte Assertion; das Portal prüft beide Anforderungen |
| Vertrauensanker | X.509-Signaturzertifikat des IdP aus der freigegebenen Metadatenquelle |
| Gültigkeit | Kurzlebige SAML-Antworten gemäß IdP-Standard; die Korrelation von AuthnRequest und Response ist auf fünf Minuten begrenzt |
| Weiterleitungen | RelayState wird nur als lokaler Portalpfad akzeptiert; externe Rücksprungziele werden verworfen |
| Account Linking | Nur nach erfolgreicher SAML-Signaturprüfung und nur zu einem bereits vorhandenen, freigegebenen Portalkonto |
| Zertifikatswechsel | Vorankündigung, parallele Bereitstellung von Alt- und Neuzertifikat während der Übergangsfrist sowie technische Kontaktperson |
| Assertion-Verschlüsselung | In der ersten Ausbaustufe nicht aktiviert; bei entsprechender Hochschulvorgabe wird eine separate SP-Schlüsselverwaltung ergänzt |

Die rechtliche Freigabe, insbesondere zur Attributfreigabe und zur Dokumentation der Zwecke, erfolgt durch die zuständigen Stellen der HTW Berlin. Dieses Dokument ersetzt keine datenschutzrechtliche oder informationssicherheitsrechtliche Bewertung.

## 7. Vorgeschlagener Ablauf

| Schritt | Verantwortung | Ergebnis |
|---|---|---|
| 1 | HTW Berlin / Projektteam | Technische Ansprechpersonen und Testumgebung benannt |
| 2 | Projektteam | SP-Metadaten-URL und Werte aus Abschnitt 3 übermittelt |
| 3 | HTW Berlin | Test-IdP-Metadaten, Attributvertrag und Testzugänge bereitgestellt |
| 4 | Projektteam | IdP-Daten auf der Superadmin-Seite hinterlegt, aber noch nicht aktiviert |
| 5 | Gemeinsam | Test von Signatur, Attributen, Account Linking, Rollenstatus und Fehlerfällen |
| 6 | HTW Berlin | Produktivmetadaten, Zertifikatsrotation und Betriebsfreigabe bestätigt |
| 7 | Projektteam | Produktivwerte hinterlegt und SAML-Anmeldung aktiviert |
| 8 | Gemeinsam | Abnahme, Monitoring der Login-Versuche und dokumentierter Rückfall auf die lokale Anmeldung |

## 8. Abnahmekriterien

Vor der Aktivierung in Produktion sollen mindestens folgende Fälle erfolgreich nachgewiesen werden:

1. Ein freigegebenes, bereits registriertes Studierendenkonto kann sich per HTW-Berlin-Web-Login anmelden.
2. Ein freigegebenes Prüfungs- oder Verwaltungskonto wird seiner bestehenden Rolle zugeordnet.
3. Ein noch nicht freigegebenes Konto erhält keinen Zugang zum Dashboard.
4. Eine SAML-Identität ohne bestehendes lokales Konto erhält keinen automatischen Account und wird verständlich zur Registrierung geführt.
5. Manipulierte, abgelaufene oder mit unbekanntem Zertifikat signierte Antworten werden abgewiesen.
6. Ein fehlendes Pflichtattribut wird protokolliert und führt nicht zu einer Anmeldung.
7. Die lokale E-Mail-und-Passwort-Anmeldung bleibt parallel funktionsfähig.

## 9. Kontakt- und Rückmeldevorlage

> **Betreff:** Registrierung des Thesis Match Makers als SAML-2.0-Service-Provider
>
> Für den Thesis Match Maker der HTW Berlin möchten wir eine optionale Anmeldung über den zentralen Web Login einrichten. Die bestehende lokale Anmeldung bleibt parallel erhalten. Bitte stellen Sie uns für Test und Produktion jeweils die IdP-Metadaten (URL oder signierte XML-Datei), die IdP-Entity-ID, den SSO-Endpunkt, das aktuelle X.509-Signaturzertifikat sowie die Freigabe der Attribute `NameID`, `mail`, `givenName` und `sn` bereit.
>
> Unsere Service-Provider-Metadaten sind unter `https://thesis.htw-berlin.com/api/auth/saml/metadata` abrufbar. Die Service-Provider-Entity-ID lautet `https://thesis.htw-berlin.com/saml/metadata`, die ACS-URL lautet `https://thesis.htw-berlin.com/api/auth/saml/acs`.
>
> Bitte benennen Sie außerdem eine technische Kontaktstelle und das Verfahren für Zertifikatsrotationen. Wir stimmen anschließend ein Testszenario und die Produktivfreigabe mit Ihnen ab.

## Referenzen

[1] [OASIS: Metadata for the Security Assertion Markup Language (SAML) V2.0](https://docs.oasis-open.org/security/saml/v2.0/saml-metadata-2.0-os.pdf)  
[2] [IdentityServer: Beispiel für Service-Provider-Metadaten](https://docs.identityserver.com/saml2p/protocol/examples/sp-metadata/)  
[3] [Harvard University IAM: SAML/Shibboleth-Integrationsleitfaden](https://www.iam.harvard.edu/authentication-how-guide-samlshibboleth-integration)
