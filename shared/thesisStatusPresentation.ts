export type ThesisStatusInput = {
  status?: string | null;
  defenseEligibility?: string | null;
};

export function getThesisStatusPresentation(input: ThesisStatusInput) {
  if (input.defenseEligibility === "approved") return { label: "Thesis kann verteidigt werden", tone: "green" as const };
  if (input.status === "COMPLETED") return { label: "Arbeit abgegeben", tone: "blue" as const };
  if (["PENDING", "PENDING_FIRST_EXAMINER", "FIRST_EXAMINER_ASSIGNED", "CONDITIONAL_ACCEPTANCE"].includes(input.status ?? "")) {
    return { label: "Warten auf Erstgutachter:in", tone: "amber" as const };
  }
  if (["PENDING_SECOND_EXAMINER", "FIRST_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET"].includes(input.status ?? "")) {
    return { label: "Warten auf Zweitgutachter:in", tone: "amber" as const };
  }
  if (["SECOND_EXAMINER_ACCEPTED", "ACCEPTED", "MATCHED", "REGISTERED"].includes(input.status ?? "")) {
    return { label: "Work in Progress", tone: "blue" as const };
  }
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
