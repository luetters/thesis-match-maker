export type SecondExaminerFilter = "NONE" | "REQUESTED" | "ACCEPTED" | "REJECTED";

export type AdminRequestFilterInput = {
  statusFilters: string[];
  secondExaminerFilters: SecondExaminerFilter[];
  department: string;
  programme: string;
  semester: string;
  search: string;
};

export type AdminRequestFilterable = {
  status: string;
  title?: string | null;
  department?: string | null;
  programmeId?: number | null;
  programmeAbbreviation?: string | null;
  programmeName?: string | null;
  targetSemester?: string | null;
  studentName?: string | null;
  firstExaminerName?: string | null;
  secondExaminerName?: string | null;
  wantedExaminerName?: string | null;
  secondExaminerId?: number | null;
  wantedSecondExaminerId?: number | null;
  secondExaminerRejectedAt?: string | Date | null;
};

export function getProgrammeFilterValue(request: AdminRequestFilterable): string {
  return request.programmeId?.toString()
    ?? request.programmeAbbreviation
    ?? request.programmeName
    ?? "";
}

export function matchesSecondExaminerFilter(request: AdminRequestFilterable, filter: SecondExaminerFilter): boolean {
  if (filter === "NONE") return !request.secondExaminerId && !request.wantedSecondExaminerId;
  if (filter === "REQUESTED") return Boolean(request.wantedSecondExaminerId) && !request.secondExaminerId && !request.secondExaminerRejectedAt;
  if (filter === "ACCEPTED") return Boolean(request.secondExaminerId);
  return Boolean(request.secondExaminerRejectedAt) && !request.secondExaminerId;
}

export function matchesAdminRequestFilters(request: AdminRequestFilterable, filters: AdminRequestFilterInput): boolean {
  const programmeLabel = request.programmeAbbreviation ?? request.programmeName ?? request.department ?? "";
  const searchTerm = filters.search.trim().toLocaleLowerCase("de-DE");
  const matchesSearch = !searchTerm || [
    request.title,
    programmeLabel,
    request.studentName,
    request.firstExaminerName,
    request.secondExaminerName,
    request.wantedExaminerName,
  ].some((value) => (value ?? "").toLocaleLowerCase("de-DE").includes(searchTerm));

  return matchesSearch
    && (filters.statusFilters.length === 0 || filters.statusFilters.includes(request.status))
    && (filters.secondExaminerFilters.length === 0 || filters.secondExaminerFilters.some((filter) => matchesSecondExaminerFilter(request, filter)))
    && (filters.department === "ALL" || request.department === filters.department)
    && (filters.programme === "ALL" || getProgrammeFilterValue(request) === filters.programme)
    && (filters.semester === "ALL" || request.targetSemester === filters.semester);
}
