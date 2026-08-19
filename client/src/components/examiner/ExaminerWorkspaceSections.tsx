import type { ReactNode } from "react";

function ExaminerWorkspaceSection({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} data-module={label}>{children}</section>;
}

/** Stabile Modulgrenze für alle Prüf- und Annahmeanfragen. */
export function ExaminerRequestsSection({ children }: { children: ReactNode }) {
  return <ExaminerWorkspaceSection label="Prüfer:innen-Anfragen">{children}</ExaminerWorkspaceSection>;
}

/** Stabile Modulgrenze für Berichtsvorschau, Exporte und Fallhistorien. */
export function ExaminerReportsSection({ children }: { children: ReactNode }) {
  return <ExaminerWorkspaceSection label="Prüfer:innen-Berichte">{children}</ExaminerWorkspaceSection>;
}
