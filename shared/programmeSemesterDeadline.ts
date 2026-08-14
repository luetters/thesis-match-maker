export type ProgrammeSemesterDeadlineRule = {
  id: number;
  department: string;
  programmeId: number | null;
  semester: string;
  registrationDeadline: string;
  submissionDeadline: string;
};

export function resolveProgrammeSemesterDeadline(
  rules: ProgrammeSemesterDeadlineRule[],
  input: { department: string; programmeId?: number | null; semester: string },
) {
  const matching = rules.filter((rule) => rule.department === input.department && rule.semester === input.semester);
  return matching.find((rule) => rule.programmeId === input.programmeId)
    ?? matching.find((rule) => rule.programmeId === null)
    ?? null;
}
