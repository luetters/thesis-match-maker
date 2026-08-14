export type SamlErrorInfo = {
  title: string;
  description: string;
  guidance: string;
  showRegistrationHint?: boolean;
};

const FALLBACK: SamlErrorInfo = {
  title: "Anmeldung über HTW Berlin nicht möglich",
  description: "Die Anmeldung über den zentralen Web Login konnte nicht abgeschlossen werden.",
  guidance: "Bitte versuchen Sie es erneut. Wenn das Problem bestehen bleibt, nutzen Sie die Anmeldung mit E-Mail-Adresse und Passwort oder wenden Sie sich an die Verwaltung der HTW Berlin.",
};

const ERROR_INFO: Record<string, SamlErrorInfo> = {
  saml_not_available: {
    title: "HTW-Berlin-Web-Login derzeit nicht verfügbar",
    description: "Die zentrale Anmeldung ist momentan nicht aktiviert oder wird technisch gewartet.",
    guidance: "Bitte melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Portalpasswort an. Das Portalpasswort ist nicht Ihr HTW-Berlin-Passwort.",
  },
  saml_start_failed: {
    title: "Anmeldung konnte nicht gestartet werden",
    description: "Die Verbindung zum zentralen Web Login konnte nicht aufgebaut werden.",
    guidance: "Bitte versuchen Sie es in wenigen Minuten erneut. Nutzen Sie bei dringendem Zugriff die lokale Anmeldung mit E-Mail-Adresse und Portalpasswort.",
  },
  saml_invalid_response: {
    title: "Anmeldeantwort unvollständig",
    description: "Die Anmeldung wurde abgeschlossen, aber die Antwort des Web Login enthielt keine verwertbaren Daten.",
    guidance: "Bitte starten Sie die Anmeldung erneut über das Portal. Besteht das Problem fort, informieren Sie die Verwaltung mit dem Zeitpunkt des Fehlers.",
  },
  saml_missing_attributes: {
    title: "Erforderliche Anmeldedaten fehlen",
    description: "Der Web Login hat nicht alle für die Kontozuordnung erforderlichen Daten übermittelt.",
    guidance: "Bitte wenden Sie sich an die Verwaltung. Die technische Konfiguration der Attributfreigabe muss geprüft werden.",
  },
  saml_account_not_found: {
    title: "Noch kein Portalkonto vorhanden",
    description: "Für Ihre HTW-Berlin-E-Mail-Adresse wurde kein bestehendes Konto im Thesis Match Maker gefunden.",
    guidance: "Bitte registrieren Sie sich zunächst im Portal. Nach Freischaltung können Sie den HTW-Berlin-Web-Login verwenden.",
    showRegistrationHint: true,
  },
  saml_pending: {
    title: "Konto wartet noch auf Freischaltung",
    description: "Ihre Identität wurde erkannt, aber Ihr Portalkonto ist noch nicht freigegeben.",
    guidance: "Bitte warten Sie auf die Freischaltung durch die zuständige Verwaltung der HTW Berlin.",
  },
  saml_rejected: {
    title: "Portalkonto nicht freigegeben",
    description: "Ihr Registrierungsantrag wurde im Thesis Match Maker nicht freigegeben.",
    guidance: "Bitte wenden Sie sich bei Rückfragen an die zuständige Verwaltung der HTW Berlin.",
  },
  saml_validation_failed: {
    title: "Anmeldung konnte nicht verifiziert werden",
    description: "Die Sicherheitsprüfung der Anmeldeantwort war nicht erfolgreich.",
    guidance: "Bitte starten Sie die Anmeldung erneut. Besteht das Problem fort, nutzen Sie die lokale Anmeldung und informieren Sie die Verwaltung mit dem ungefähren Zeitpunkt des Fehlers.",
  },
};

export function getSamlErrorInfo(code: string | null | undefined): SamlErrorInfo {
  return (code && ERROR_INFO[code]) || FALLBACK;
}
