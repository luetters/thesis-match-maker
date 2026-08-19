import { useState } from "react";
import { toast } from "sonner";
import { buildFullName } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/UserAvatar";

type ExaminerSlot = "first" | "second";

/** Modal für die kontrollierte direkte Zuweisung einer prüfenden Person. */
export function AssignExaminerModal({ thesisId, thesisTitle, onClose }: { thesisId: number; thesisTitle: string; onClose: () => void }) {
  const { data: examiners } = trpc.examiner.list.useQuery();
  const [selectedExaminer, setSelectedExaminer] = useState<number | null>(null);
  const [slot, setSlot] = useState<ExaminerSlot>("first");
  const utils = trpc.useUtils();
  const assignMutation = trpc.thesis.assignExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in erfolgreich zugewiesen!");
      utils.thesis.all.invalidate();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-1 font-bold text-gray-900">Prüfer:in zuweisen</h3>
        <p className="mb-5 truncate text-sm text-gray-500">{thesisTitle}</p>
        <div className="mb-4"><label className="mb-1.5 block text-sm font-medium text-gray-700">Slot</label><div className="grid grid-cols-2 gap-2">{(["first", "second"] as const).map((value) => <button key={value} onClick={() => setSlot(value)} className={`rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${slot === value ? "border-transparent text-white" : "border-gray-200 text-gray-600"}`} style={slot === value ? { backgroundColor: "#76B900" } : undefined}>{value === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}</button>)}</div></div>
        <div className="mb-5"><label className="mb-1.5 block text-sm font-medium text-gray-700">Prüfer:in auswählen</label><div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2">{examiners?.map(({ user, profile }) => {
          const name = buildFullName({ firstName: (user as any).firstName, lastName: (user as any).lastName, academicTitle: (user as any).academicTitle ?? profile?.title, name: user.name });
          return <button key={user.id} onClick={() => setSelectedExaminer(user.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${selectedExaminer === user.id ? "text-white" : "hover:bg-gray-50"}`} style={selectedExaminer === user.id ? { backgroundColor: "#76B900" } : undefined}><UserAvatar name={name} email={user.email} avatarUrl={user.avatarUrl} size="md" /><div className="min-w-0"><div className={`truncate text-sm font-medium ${selectedExaminer === user.id ? "text-white" : "text-gray-900"}`}>{name}</div>{profile?.department && <div className={`truncate text-xs ${selectedExaminer === user.id ? "text-white/70" : "text-gray-500"}`}>{profile.department}</div>}</div></button>;
        })}{!examiners?.length && <p className="py-4 text-center text-sm text-gray-500">Keine Prüfer:innen gefunden.</p>}</div></div>
        <div className="flex gap-3"><button onClick={() => { if (!selectedExaminer) { toast.error("Bitte Prüfer:in auswählen"); return; } assignMutation.mutate({ thesisId, examinerId: selectedExaminer, slot }); }} disabled={assignMutation.isPending || !selectedExaminer} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: "#76B900" }}>{assignMutation.isPending ? "Wird zugewiesen..." : "Zuweisen"}</button><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100">Abbrechen</button></div>
      </div>
    </div>
  );
}
