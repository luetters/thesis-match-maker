import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCheck, Search, AlertCircle, CheckCircle2, Users, TrendingUp } from "lucide-react";

interface ThesisRequest {
  id: number;
  title?: string | null;
  studentName?: string | null;
  targetSemester?: string | null;
  department?: string | null;
  examinerId?: number | null;
  secondExaminerId?: number | null;
  status?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  thesis: ThesisRequest;
  onSuccess?: () => void;
}

type ExaminerEntry = {
  id: number;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  academicTitle?: string | null;
  email: string;
  role: string;
  department?: string | null;
  studyPrograms?: string | null;
  isSecondExaminer?: number | null;
  activeFirstSupervisions: number;
  activeSecondSupervisions: number;
  semesterMaxFirst: number | null;
  semesterMaxSecond: number | null;
  availableAsFirst: boolean;
  availableAsSecond: boolean;
};

function displayName(e: ExaminerEntry): string {
  const parts = [e.academicTitle, e.firstName, e.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (e.name ?? e.email);
}

/** Horizontaler Auslastungsbalken */
function LoadBar({ current, max }: { current: number; max: number | null }) {
  if (max === null || max === 0) return null;
  const pct = Math.min(100, Math.round((current / max) * 100));
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-[#76B900]";
  return (
    <div className="w-full mt-1">
      <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
        <span>{current} aktiv</span>
        <span>max {max}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AvailabilityBadge({
  available,
  current,
  max,
}: {
  available: boolean;
  current: number;
  max: number | null;
}) {
  if (max === null) {
    return (
      <Badge variant="outline" className="text-xs text-gray-500">
        Keine Grenze
      </Badge>
    );
  }
  if (available) {
    return (
      <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {current}/{max}
      </Badge>
    );
  }
  return (
    <Badge className="text-xs bg-red-100 text-red-800 border-red-300">
      <AlertCircle className="w-3 h-3 mr-1" />
      {current}/{max} voll
    </Badge>
  );
}

type SortMode = "load" | "name";

export function AdminAssignExaminersModal({
  open,
  onClose,
  thesis,
  onSuccess,
}: Props) {
  const [firstSearch, setFirstSearch] = useState("");
  const [secondSearch, setSecondSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("load");
  const [selectedFirstId, setSelectedFirstId] = useState<number | null>(
    thesis.examinerId ?? null
  );
  const [selectedSecondId, setSelectedSecondId] = useState<number | null>(
    thesis.secondExaminerId ?? null
  );

  const { data: examiners = [], isLoading } = (
    trpc as any
  ).admin.getExaminersWithAvailability.useQuery(
    { semester: thesis.targetSemester ?? undefined },
    { enabled: open }
  );

  const assignMutation = (trpc as any).admin.assignExaminers.useMutation({
    onSuccess: () => {
      toast.success(
        "Zuweisung erfolgreich – Die Gutachter:innen wurden der Anfrage zugewiesen."
      );
      onSuccess?.();
      onClose();
    },
    onError: (err: { message: string }) => {
      toast.error(`Fehler bei der Zuweisung: ${err.message}`);
    },
  });

  const firstExaminers = useMemo(
    () =>
      (examiners as ExaminerEntry[]).filter(
        (e: ExaminerEntry) => e.role === "examiner"
      ),
    [examiners]
  );
  const secondExaminers = useMemo(
    () =>
      (examiners as ExaminerEntry[]).filter(
        (e: ExaminerEntry) =>
          e.role === "examiner" || e.role === "second_examiner"
      ),
    [examiners]
  );

  /** Auslastungs-Ratio: 0 = frei, 1+ = voll/über */
  function loadRatio(e: ExaminerEntry, slot: "first" | "second"): number {
    const cur = slot === "first" ? e.activeFirstSupervisions : e.activeSecondSupervisions;
    const max = slot === "first" ? e.semesterMaxFirst : e.semesterMaxSecond;
    if (max === null || max === 0) return 0; // keine Grenze → ganz vorne
    return cur / max;
  }

  function sortList(list: ExaminerEntry[], slot: "first" | "second"): ExaminerEntry[] {
    if (sortMode === "name") {
      return [...list].sort((a, b) => displayName(a).localeCompare(displayName(b), "de"));
    }
    // load: aufsteigend nach Auslastungsquote, dann alphabetisch
    return [...list].sort((a, b) => {
      const diff = loadRatio(a, slot) - loadRatio(b, slot);
      if (diff !== 0) return diff;
      return displayName(a).localeCompare(displayName(b), "de");
    });
  }

  const filteredFirst = useMemo(() => {
    const q = firstSearch.toLowerCase();
    const filtered = firstExaminers.filter(
      (e: ExaminerEntry) =>
        displayName(e).toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
    return sortList(filtered, "first");
  }, [firstExaminers, firstSearch, sortMode]);

  const filteredSecond = useMemo(() => {
    const q = secondSearch.toLowerCase();
    const filtered = secondExaminers.filter(
      (e: ExaminerEntry) =>
        displayName(e).toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
    return sortList(filtered, "second");
  }, [secondExaminers, secondSearch, sortMode]);

  const crossDepartmentSelections = useMemo(() => {
    if (!thesis.department) return [] as ExaminerEntry[];
    return [selectedFirstId, selectedSecondId]
      .filter((id): id is number => id !== null)
      .map((id) => (examiners as ExaminerEntry[]).find((examiner) => examiner.id === id))
      .filter((examiner): examiner is ExaminerEntry => Boolean(examiner?.department && examiner.department !== thesis.department));
  }, [examiners, selectedFirstId, selectedSecondId, thesis.department]);

  const handleAssign = () => {
    if (!selectedFirstId && !selectedSecondId) {
      toast.error(
        "Keine Auswahl – Bitte wählen Sie mindestens eine Gutachter:in aus."
      );
      return;
    }
    if (crossDepartmentSelections.length > 0) {
      const names = crossDepartmentSelections.map(displayName).join(", ");
      const proceed = window.confirm(`Fachbereichsübergreifende Betreuung: ${names} gehört/en nicht zu ${thesis.department}. Die Zuweisung bleibt möglich. Möchten Sie fortfahren?`);
      if (!proceed) return;
    }
    assignMutation.mutate({
      thesisRequestId: thesis.id,
      firstExaminerId: selectedFirstId,
      secondExaminerId: selectedSecondId,
    });
  };

  /** Zusammenfassungszeile oben: Gesamtauslastung aller Prüfer */
  const stats = useMemo(() => {
    const list = examiners as ExaminerEntry[];
    const total = list.length;
    const overloaded = list.filter(
      (e) => e.semesterMaxFirst !== null && e.activeFirstSupervisions >= (e.semesterMaxFirst ?? 0)
    ).length;
    const available = total - overloaded;
    return { total, overloaded, available };
  }, [examiners]);

  const ExaminerRow = ({
    examiner,
    selected,
    onSelect,
    slot,
  }: {
    examiner: ExaminerEntry;
    selected: boolean;
    onSelect: () => void;
    slot: "first" | "second";
  }) => {
    const available =
      slot === "first" ? examiner.availableAsFirst : examiner.availableAsSecond;
    const current =
      slot === "first"
        ? examiner.activeFirstSupervisions
        : examiner.activeSecondSupervisions;
    const max =
      slot === "first" ? examiner.semesterMaxFirst : examiner.semesterMaxSecond;

    return (
      <div
        onClick={onSelect}
        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
          selected
            ? "border-[#76B900] bg-green-50"
            : available
            ? "border-gray-200 hover:border-[#76B900]/60 hover:bg-green-50/40"
            : "border-orange-200 bg-orange-50/30 hover:border-orange-400"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                selected
                  ? "bg-[#76B900] text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {displayName(examiner).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {displayName(examiner)}
              </p>
              <p className="text-xs text-gray-500 truncate">{examiner.email}</p>
              {examiner.department && (
                <p className="text-xs text-gray-400 truncate">
                  {examiner.department}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <AvailabilityBadge available={available} current={current} max={max} />
            {selected && (
              <Badge className="text-xs bg-[#76B900] text-white">
                Ausgewählt
              </Badge>
            )}
          </div>
        </div>
        {/* Auslastungsbalken */}
        <div className="mt-1.5 px-0.5">
          <LoadBar current={current} max={max} />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5 text-[#76B900]" />
            Gutachter:innen zuweisen
          </DialogTitle>
          <div className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">
              {thesis.title ?? "Thema wird noch festgelegt"}
            </span>
            {thesis.studentName && (
              <span className="ml-2 text-gray-400">· {thesis.studentName}</span>
            )}
            {thesis.targetSemester && (
              <span className="ml-2 text-gray-400">
                · {thesis.targetSemester}
              </span>
            )}
          </div>
        </DialogHeader>

        {crossDepartmentSelections.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Fachbereichsübergreifende Zuweisung</p>
              <p className="mt-0.5 text-xs leading-5">Die Anfrage stammt aus {thesis.department}; ausgewählte Prüfer:innen gehören zu einem anderen Fachbereich. Die Betreuung ist zulässig, wird aber in der Verwaltungsstatistik als fachbereichsübergreifend ausgewiesen.</p>
            </div>
          </div>
        )}

        {/* Auslastungs-Zusammenfassung + Sortier-Toggle */}
        {!isLoading && (examiners as ExaminerEntry[]).length > 0 && (
          <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border text-xs text-gray-600">
            <TrendingUp className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              <span className="font-semibold text-gray-800">{stats.total}</span>{" "}
              Prüfer:innen gesamt
            </span>
            <span className="text-green-700">
              <span className="font-semibold">{stats.available}</span> verfügbar
            </span>
            <span className="text-red-600">
              <span className="font-semibold">{stats.overloaded}</span> ausgelastet
            </span>
            {/* Sortier-Toggle */}
            <div className="ml-auto flex items-center gap-1">
              <span className="text-gray-400">Sortierung:</span>
              <button
                onClick={() => setSortMode("load")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  sortMode === "load"
                    ? "bg-[#76B900] text-white border-[#76B900]"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Auslastung ↑
              </button>
              <button
                onClick={() => setSortMode("name")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  sortMode === "name"
                    ? "bg-[#76B900] text-white border-[#76B900]"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
              >
                Name A–Z
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Users className="w-6 h-6 mr-2 animate-pulse" />
            Lade Prüfer:innen…
          </div>
        ) : (
          <div className="flex gap-4 overflow-hidden flex-1 min-h-0">
            {/* Erstgutachter:in */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-2">
                <h3 className="font-semibold text-sm text-gray-800 mb-1">
                  Erstgutachter:in
                </h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Suchen…"
                    value={firstSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFirstSearch(e.target.value)
                    }
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredFirst.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Keine Prüfer:innen gefunden
                  </p>
                ) : (
                  (filteredFirst as ExaminerEntry[]).map((e: ExaminerEntry) => (
                    <ExaminerRow
                      key={e.id}
                      examiner={e}
                      selected={selectedFirstId === e.id}
                      onSelect={() =>
                        setSelectedFirstId(
                          selectedFirstId === e.id ? null : e.id
                        )
                      }
                      slot="first"
                    />
                  ))
                )}
              </div>
            </div>

            <div className="w-px bg-gray-200 shrink-0" />

            {/* Zweitgutachter:in */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-2">
                <h3 className="font-semibold text-sm text-gray-800 mb-1">
                  Zweitgutachter:in
                </h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Suchen…"
                    value={secondSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSecondSearch(e.target.value)
                    }
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredSecond.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Keine Prüfer:innen gefunden
                  </p>
                ) : (
                  (filteredSecond as ExaminerEntry[]).map(
                    (e: ExaminerEntry) => (
                      <ExaminerRow
                        key={e.id}
                        examiner={e}
                        selected={selectedSecondId === e.id}
                        onSelect={() =>
                          setSelectedSecondId(
                            selectedSecondId === e.id ? null : e.id
                          )
                        }
                        slot="second"
                      />
                    )
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedFirstId || selectedSecondId ? (
              <span>
                {selectedFirstId && (
                  <span className="mr-2 text-green-700">✓ Erstgutachter:in gewählt</span>
                )}
                {selectedSecondId && (
                  <span className="text-green-700">✓ Zweitgutachter:in gewählt</span>
                )}
              </span>
            ) : (
              "Bitte wählen Sie mindestens eine Gutachter:in aus."
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={assignMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                assignMutation.isPending ||
                (!selectedFirstId && !selectedSecondId)
              }
              className="bg-[#76B900] hover:bg-[#5a8c00] text-white"
            >
              {assignMutation.isPending ? "Wird zugewiesen…" : "Zuweisen"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
