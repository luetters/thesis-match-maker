export type DepartmentAwareExaminer = {
  user: { id: number };
  allowedDepartments?: string[];
  profile?: { department?: string | null } | null;
};

export function isInternalExaminer(examiner: DepartmentAwareExaminer, studentDepartment?: string | null): boolean {
  if (!studentDepartment) return false;
  return examiner.allowedDepartments?.includes(studentDepartment)
    ?? examiner.profile?.department === studentDepartment;
}

export function sortExaminersForStudentDepartment<T extends DepartmentAwareExaminer>(
  examiners: T[],
  studentDepartment?: string | null,
): T[] {
  return [...examiners].sort((a, b) => {
    const aInternal = isInternalExaminer(a, studentDepartment);
    const bInternal = isInternalExaminer(b, studentDepartment);
    if (aInternal !== bInternal) return aInternal ? -1 : 1;
    return a.user.id - b.user.id;
  });
}
