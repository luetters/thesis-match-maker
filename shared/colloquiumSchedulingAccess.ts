export function getColloquiumSchedulingStartState(requests: Array<{ secondExaminerId?: number | null; defenseEligibility?: string | null }>) {
  const eligibleCount = requests.filter((request) => request.secondExaminerId && request.defenseEligibility === "approved").length;
  const waitingForDefenseClearance = requests.some((request) => request.secondExaminerId && request.defenseEligibility !== "approved");
  return {
    enabled: eligibleCount > 0,
    eligibleCount,
    waitingForDefenseClearance,
    hint: waitingForDefenseClearance
      ? "Studierender nicht verteidigungsfähig"
      : "Für die Terminfindung muss eine Abschlussarbeit mit bestätigter Zweitprüfung vorliegen.",
  };
}
