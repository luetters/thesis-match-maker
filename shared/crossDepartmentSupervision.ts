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

export type ExaminerDepartmentWorkload = {
  department: HtwDepartment;
  total: number;
  internal: number;
  incoming: number;
};

export type CrossDepartmentCapacityRecord = {
  examinerDepartment: string | null;
  semester: string;
  capacity: number;
};

export type ExaminerDepartmentCapacity = {
  department: HtwDepartment;
  capacity: number;
};

function normaliseDepartment(value: string | null): HtwDepartment | null {
  return HTW_DEPARTMENTS.includes(value as HtwDepartment) ? value as HtwDepartment : null;
}

function buildWorkloadByExaminerDepartment(records: CrossDepartmentSupervisionRecord[]): ExaminerDepartmentWorkload[] {
  return HTW_DEPARTMENTS.map((department) => ({
    department,
    total: records.filter((record) => record.examinerDepartment === department).length,
    internal: records.filter((record) => record.examinerDepartment === department && record.studentDepartment === department).length,
    incoming: records.filter((record) => record.examinerDepartment === department && record.studentDepartment !== department).length,
  }));
}

function buildCapacityByExaminerDepartment(records: CrossDepartmentCapacityRecord[]): ExaminerDepartmentCapacity[] {
  return HTW_DEPARTMENTS.map((department) => ({
    department,
    capacity: records
      .filter((record) => record.examinerDepartment === department)
      .reduce((sum, record) => sum + record.capacity, 0),
  }));
}

function semesterSortValue(semester: string): number {
  const match = semester.match(/^(WS|SoSe|SS)(\d{4})$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const year = Number(match[2]);
  return year * 2 + (match[1].toUpperCase() === "WS" ? 1 : 0);
}

function sortSemestersChronologically(semesters: string[]) {
  return semesters.sort((a, b) => semesterSortValue(a) - semesterSortValue(b) || a.localeCompare(b, "de"));
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
  const workloadByExaminerDepartment = buildWorkloadByExaminerDepartment(valid);
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

/**
 * Bereitet die Betreuungsvolumina aller vorhandenen Semester für eine
 * vergleichbare Zeitreihendarstellung auf. Die Verwaltung sieht dabei nur
 * Fälle ihres eigenen Herkunftsfachbereichs; Superadmins erhalten alle Fälle.
 */
export function buildCrossDepartmentSupervisionTimeSeries(
  records: CrossDepartmentSupervisionRecord[],
  sourceDepartment?: string | null,
  capacityRecords: CrossDepartmentCapacityRecord[] = [],
) {
  const scoped = records.filter((record) => !sourceDepartment || record.studentDepartment === sourceDepartment);
  const valid = scoped.filter((record) => normaliseDepartment(record.studentDepartment) && normaliseDepartment(record.examinerDepartment));
  const validCapacityRecords = capacityRecords.filter((record) => normaliseDepartment(record.examinerDepartment));
  const semesters = sortSemestersChronologically(Array.from(new Set([
    ...valid.map((record) => record.targetSemester).filter((value): value is string => Boolean(value)),
    ...validCapacityRecords.map((record) => record.semester),
  ])));

  return {
    departments: HTW_DEPARTMENTS,
    semesters,
    points: semesters.map((semester) => ({
      semester,
      workloadByExaminerDepartment: buildWorkloadByExaminerDepartment(valid.filter((record) => record.targetSemester === semester)),
      capacityByExaminerDepartment: buildCapacityByExaminerDepartment(validCapacityRecords.filter((record) => record.semester === semester)),
    })),
  };
}
