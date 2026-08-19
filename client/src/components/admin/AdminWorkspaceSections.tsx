import type { ReactNode } from "react";

function AdminWorkspaceSection({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} data-module={label}>{children}</section>;
}

/** Stabile Modulgrenze für die fachliche Audit-Ansicht. */
export function AdminAuditSection({ children }: { children: ReactNode }) {
  return <AdminWorkspaceSection label="Audit-Protokoll">{children}</AdminWorkspaceSection>;
}

/** Stabile Modulgrenze für Suche, Rollen- und Nutzerverwaltung. */
export function AdminUserManagementSection({ children }: { children: ReactNode }) {
  return <AdminWorkspaceSection label="Nutzerverwaltung">{children}</AdminWorkspaceSection>;
}
