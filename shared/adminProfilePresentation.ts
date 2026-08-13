export function shouldShowAdminScope(role: string | null | undefined): boolean {
  return role === "admin";
}

export function getAdminScopeBadgeLabel(department: string | null | undefined): string {
  return department ? `Verwaltung · ${department}` : "Verwaltung";
}
