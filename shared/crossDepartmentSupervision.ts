export const HTW_DEPARTMENTS = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;
export type HtwDepartment = typeof HTW_DEPARTMENTS[number];

export type CrossDepartmentSupervisionRecord = {
  requestId: number;
  studentDepartment: string | null;
  examinerDepartment: string | null;
  studentName: string | null;
  examinerName: string | null;
  title: string;
  status: string;
  targetSemester: string | null;
};

function normaliseDepartment(value: string | null): HtwDepartment | null {
  return HTW_DEPARTMENTS.includes(value as HtwDepartment) ? value as HtwDepartment : null;
}

export function buildCrossDepartmentSupervisionOverview(
  records: CrossDepartmentSupervisionRecord[],
  sourceDepartment?: string | null,
  semester?: string | null,
) {
  const scoped = records.filter((record) =>
    (!sourceDepartment || record.studentDepartment === sourceDepartment)
    && (!semester || record.targetSemester === semester),
  );
  const matrix = HTW_DEPARTMENTS.map((studentDepartment) => ({
    studentDepartment,
    values: HTW_DEPARTMENTS.map((examinerDepartment) => ({
      examinerDepartment,
      count: scoped.filter((record) => record.studentDepartment === studentDepartment && record.examinerDepartment === examinerDepartment).length,
    })),
  }));
  const valid = scoped.filter((record) => normaliseDepartment(record.studentDepartment) && normaliseDepartment(record.examinerDepartment));
  const crossDepartmentCases = valid.filter((record) => record.studentDepartment !== record.examinerDepartment);
  const availableSemesters = Array.from(new Set(records.map((record) => record.targetSemester).filter((value): value is string => Boolean(value)))).sort((a, b) => b.localeCompare(a, "de"));
  const workloadByExaminerDepartment = HTW_DEPARTMENTS.map((department) => ({
    department,
    total: valid.filter((record) => record.examinerDepartment === department).length,
    internal: valid.filter((record) => record.examinerDepartment === department && record.studentDepartment === department).length,
    incoming: valid.filter((record) => record.examinerDepartment === department && record.studentDepartment !== department).length,
  }));
  return {
    departments: HTW_DEPARTMENTS,
    availableSemesters,
    selectedSemester: semester ?? null,
    matrix,
    total: valid.length,
    internalCount: valid.length - crossDepartmentCases.length,
    crossDepartmentCount: crossDepartmentCases.length,
    workloadByExaminerDepartment,
    cases: crossDepartmentCases,
  };
}
