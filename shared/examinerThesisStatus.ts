export type ThesisStatusInput = { status?: string | null; defenseEligibility?: string | null };

export function getReadableThesisStatus(input: ThesisStatusInput) {
  if (input.defenseEligibility === "approved") return { label: "Thesis kann verteidigt werden", tone: "green" as const };
  if (input.status === "COMPLETED") return { label: "Arbeit abgegeben", tone: "blue" as const };
  if (["PENDING", "PENDING_FIRST_EXAMINER", "FIRST_EXAMINER_ASSIGNED", "CONDITIONAL_ACCEPTANCE"].includes(input.status ?? "")) return { label: "Warten auf Erstgutachter:in", tone: "amber" as const };
  if (["PENDING_SECOND_EXAMINER", "FIRST_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET"].includes(input.status ?? "")) return { label: "Warten auf Zweitgutachter:in", tone: "amber" as const };
  if (["SECOND_EXAMINER_ACCEPTED", "ACCEPTED", "MATCHED"].includes(input.status ?? "")) return { label: "Work in Progress", tone: "blue" as const };
  if (input.status === "REJECTED") return { label: "Abgelehnt", tone: "red" as const };
  if (["WITHDRAWN", "CANCELLED"].includes(input.status ?? "")) return { label: "Abgebrochen", tone: "gray" as const };
  return { label: "In Bearbeitung", tone: "gray" as const };
}

export const thesisStatusToneClasses = {
  green: "bg-[#76B900]/15 text-[#456d00]",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-700",
};

export type DeadlineUrgency = "missing" | "scheduled" | "due_soon" | "overdue";

export function getDeadlineUrgency(deadline?: string | null, now = new Date()): DeadlineUrgency {
  if (!deadline) return "missing";
  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return "missing";
  due.setHours(23, 59, 59, 999);
  const differenceInDays = Math.floor((due.getTime() - now.getTime()) / 86_400_000);
  if (differenceInDays < 0) return "overdue";
  if (differenceInDays <= 14) return "due_soon";
  return "scheduled";
}

export function isAwaitingExaminerReview(request: { status?: string | null; examinerId?: number | null; secondExaminerId?: number | null; wantedExaminerId?: number | null; wantedSecondExaminerId?: number | null }, userId?: number) {
  if (!userId) return false;
  return (request.status === "PENDING_FIRST_EXAMINER" && (request.examinerId === userId || request.wantedExaminerId === userId)) ||
    (request.status === "PENDING_SECOND_EXAMINER" && (request.secondExaminerId === userId || request.wantedSecondExaminerId === userId));
}

export type ExaminerRoleFilter = "all" | "first" | "second";

export function matchesExaminerThesisFilters(
  request: { programmeId?: number | null; programmeName?: string | null; examinerId?: number | null; secondExaminerId?: number | null; wantedExaminerId?: number | null; wantedSecondExaminerId?: number | null },
  userId: number | undefined,
  programmeFilter: string,
  roleFilter: ExaminerRoleFilter,
) {
  const programmeKey = String(request.programmeId ?? request.programmeName ?? "");
  const matchesProgramme = programmeFilter === "all" || programmeKey === programmeFilter;
  if (!matchesProgramme) return false;
  if (roleFilter === "all") return true;
  if (!userId) return false;
  const isFirstExaminer = request.examinerId === userId || request.wantedExaminerId === userId;
  const isSecondExaminer = request.secondExaminerId === userId || request.wantedSecondExaminerId === userId;
  return roleFilter === "first" ? isFirstExaminer : isSecondExaminer;
}
