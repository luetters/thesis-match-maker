export type RegistrationApprovalNotice = {
  dashboardPath: "/admin" | "/superadmin";
  subjectPrefix: string;
  headline: string;
  intro: string;
  instruction: string;
  actionLabel: string;
};

/** Liefert die passende Freigabeinformation für die Benachrichtigung an Superadmins. */
export function getRegistrationApprovalNotice(requestedRole: string): RegistrationApprovalNotice {
  if (requestedRole === "admin") {
    return {
      dashboardPath: "/superadmin",
      subjectPrefix: "Neue Verwaltungsanmeldung",
      headline: "Neue Verwaltungsanmeldung wartet auf Ihre Freischaltung",
      intro: "Eine neue Person hat sich als Verwaltungsmitarbeiter:in registriert.",
      instruction: "Diese Rolle darf ausschließlich durch einen Superadmin freigeschaltet oder abgelehnt werden.",
      actionLabel: "Zum Superadmin-Dashboard",
    };
  }

  return {
    dashboardPath: "/admin",
    subjectPrefix: "Neue Registrierung",
    headline: "Neue Registrierung wartet auf Freischaltung",
    intro: "Eine neue Person hat sich registriert und wartet auf Ihre Freischaltung:",
    instruction: "Bitte melden Sie sich im Admin-Dashboard an, um den Zugang freizuschalten oder abzulehnen.",
    actionLabel: "Zum Admin-Dashboard",
  };
}
