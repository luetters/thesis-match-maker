import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCheck, Search, AlertCircle, CheckCircle2, Users } from "lucide-react";

interface ThesisRequest {
  id: number;
  title?: string | null;
  studentName?: string | null;
  targetSemester?: string | null;
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

function AvailabilityBadge({ available, current, max }: { available: boolean; current: number; max: number | null }) {
  if (max === null) {
    return <Badge variant="outline" className="text-xs text-gray-500">Keine Kapazitätsgrenze</Badge>;
  }
  if (available) {
    return (
      <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {current}/{max} verfügbar
      </Badge>
    );
  }
  return (
    <Badge className="text-xs bg-red-100 text-red-800 border-red-300">
      <AlertCircle className="w-3 h-3 mr-1" />
      {current}/{max} ausgelastet
    </Badge>
  );
}

export function AdminAssignExaminersModal({ open, onClose, thesis, onSuccess }: Props) {
  const [firstSearch, setFirstSearch] = useState("");
  const [secondSearch, setSecondSearch] = useState("");
  const [selectedFirstId, setSelectedFirstId] = useState<number | null>(thesis.examinerId ?? null);
  const [selectedSecondId, setSelectedSecondId] = useState<number | null>(thesis.secondExaminerId ?? null);

  const { data: examiners = [], isLoading } = (trpc as any).admin.getExaminersWithAvailability.useQuery(
    { semester: thesis.targetSemester ?? undefined },
    { enabled: open }
  );

  const assignMutation = (trpc as any).admin.assignExaminers.useMutation({
    onSuccess: () => {
      toast.success("Zuweisung erfolgreich – Die Gutachter:innen wurden der Anfrage zugewiesen.");
      onSuccess?.();
      onClose();
    },
    onError: (err: { message: string }) => {
      toast.error(`Fehler bei der Zuweisung: ${err.message}`);
    },
  });

  const firstExaminers = useMemo(
    () => (examiners as ExaminerEntry[]).filter((e: ExaminerEntry) => e.role === "examiner"),
    [examiners]
  );
  const secondExaminers = useMemo(
    () => (examiners as ExaminerEntry[]).filter((e: ExaminerEntry) => e.role === "examiner" || e.role === "second_examiner"),
    [examiners]
  );

  const filteredFirst = useMemo(() => {
    const q = firstSearch.toLowerCase();
    return firstExaminers.filter(
      (e: ExaminerEntry) =>
        displayName(e).toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
  }, [firstExaminers, firstSearch]);

  const filteredSecond = useMemo(() => {
    const q = secondSearch.toLowerCase();
    return secondExaminers.filter(
      (e: ExaminerEntry) =>
        displayName(e).toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
    );
  }, [secondExaminers, secondSearch]);

  const handleAssign = () => {
    if (!selectedFirstId && !selectedSecondId) {
      toast.error("Keine Auswahl – Bitte wählen Sie mindestens eine Gutachter:in aus.");
      return;
    }
    assignMutation.mutate({
      thesisRequestId: thesis.id,
      firstExaminerId: selectedFirstId,
      secondExaminerId: selectedSecondId,
    });
  };

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
    const available = slot === "first" ? examiner.availableAsFirst : examiner.availableAsSecond;
    const current = slot === "first" ? examiner.activeFirstSupervisions : examiner.activeSecondSupervisions;
    const max = slot === "first" ? examiner.semesterMaxFirst : examiner.semesterMaxSecond;

    return (
      <div
        onClick={onSelect}
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
          selected
            ? "border-green-500 bg-green-50"
            : available
            ? "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
            : "border-orange-200 bg-orange-50/30 hover:border-orange-400"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
            selected ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
          }`}>
            {displayName(examiner).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{displayName(examiner)}</p>
            <p className="text-xs text-gray-500 truncate">{examiner.email}</p>
            {examiner.department && (
              <p className="text-xs text-gray-400 truncate">{examiner.department}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <AvailabilityBadge available={available} current={current} max={max} />
          {selected && (
            <Badge className="text-xs bg-green-600 text-white">Ausgewählt</Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="w-5 h-5 text-green-600" />
            Gutachter:innen zuweisen
          </DialogTitle>
          <div className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{thesis.title ?? "Thema wird noch festgelegt"}</span>
            {thesis.studentName && <span className="ml-2 text-gray-400">· {thesis.studentName}</span>}
            {thesis.targetSemester && <span className="ml-2 text-gray-400">· {thesis.targetSemester}</span>}
          </div>
        </DialogHeader>

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
                <h3 className="font-semibold text-sm text-gray-800 mb-1">Erstgutachter:in</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Suchen…"
                    value={firstSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredFirst.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Keine Prüfer:innen gefunden</p>
                ) : (
                  (filteredFirst as ExaminerEntry[]).map((e: ExaminerEntry) => (
                    <ExaminerRow
                      key={e.id}
                      examiner={e}
                      selected={selectedFirstId === e.id}
                      onSelect={() => setSelectedFirstId(selectedFirstId === e.id ? null : e.id)}
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
                <h3 className="font-semibold text-sm text-gray-800 mb-1">Zweitgutachter:in</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Suchen…"
                    value={secondSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredSecond.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Keine Prüfer:innen gefunden</p>
                ) : (
                  (filteredSecond as ExaminerEntry[]).map((e: ExaminerEntry) => (
                    <ExaminerRow
                      key={e.id}
                      examiner={e}
                      selected={selectedSecondId === e.id}
                      onSelect={() => setSelectedSecondId(selectedSecondId === e.id ? null : e.id)}
                      slot="second"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {selectedFirstId || selectedSecondId ? (
              <span>
                {selectedFirstId && <span className="mr-2">✓ Erstgutachter:in gewählt</span>}
                {selectedSecondId && <span>✓ Zweitgutachter:in gewählt</span>}
              </span>
            ) : (
              "Bitte wählen Sie mindestens eine Gutachter:in aus."
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={assignMutation.isPending}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assignMutation.isPending || (!selectedFirstId && !selectedSecondId)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {assignMutation.isPending ? "Wird zugewiesen…" : "Zuweisen"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
