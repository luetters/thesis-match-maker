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
) {
  const scoped = sourceDepartment
    ? records.filter((record) => record.studentDepartment === sourceDepartment)
    : records;
  const matrix = HTW_DEPARTMENTS.map((studentDepartment) => ({
    studentDepartment,
    values: HTW_DEPARTMENTS.map((examinerDepartment) => ({
      examinerDepartment,
      count: scoped.filter((record) => record.studentDepartment === studentDepartment && record.examinerDepartment === examinerDepartment).length,
    })),
  }));
  const valid = scoped.filter((record) => normaliseDepartment(record.studentDepartment) && normaliseDepartment(record.examinerDepartment));
  const crossDepartmentCases = valid.filter((record) => record.studentDepartment !== record.examinerDepartment);
  return {
    departments: HTW_DEPARTMENTS,
    matrix,
    total: valid.length,
    internalCount: valid.length - crossDepartmentCases.length,
    crossDepartmentCount: crossDepartmentCases.length,
    cases: crossDepartmentCases,
  };
}
