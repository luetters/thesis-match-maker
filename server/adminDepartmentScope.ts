export const ADMIN_DEPARTMENTS = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;
export type AdminDepartment = (typeof ADMIN_DEPARTMENTS)[number];

export function isAdminDepartment(value: string): value is AdminDepartment {
  return ADMIN_DEPARTMENTS.includes(value as AdminDepartment);
}

export function canManageDepartment(adminDepartment: string | null | undefined, targetDepartment: string | null | undefined): boolean {
  return Boolean(adminDepartment && targetDepartment && adminDepartment === targetDepartment);
}
