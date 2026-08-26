import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type DeletionScope = "single_request" | "semester" | "closed_over_three_years";
type DeletionPreviewItem = { id: number; title: string; targetSemester: string | null; status: string; createdAt: string; caseClosedAt: string | null };
type DeletionPreviewData = { scope: DeletionScope; items: DeletionPreviewItem[]; total: number; notice: string };

const scopeLabels: Record<DeletionScope, string> = {
  single_request: "Einzelne Testanfrage",
  semester: "Vergangenes Semester",
  closed_over_three_years: "Abgeschlossene Fälle ab drei Jahren",
};

export default function DataDeletionManagement() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const superadminStatus = trpc.superadmin.getSuperadminStatus.useQuery(undefined, { enabled: !!user });
  const [scope, setScope] = useState<DeletionScope>("single_request");
  const [thesisRequestId, setThesisRequestId] = useState("");
  const [semester, setSemester] = useState("");
  const [previewInput, setPreviewInput] = useState<{ scope: DeletionScope; thesisRequestId?: number; semester?: string } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);

  const preview = (trpc.superadmin as any).deletionPreview.useQuery(
    previewInput ?? { scope: "closed_over_three_years" },
    { enabled: previewInput !== null, retry: false },
  ) as { data?: DeletionPreviewData; isLoading: boolean; error?: { message: string } };
  const deleteMutation = (trpc.superadmin as any).permanentlyDeleteThesisData.useMutation({
    onSuccess: (result: { deletedCount: number }) => {
      toast.success(`${result.deletedCount} Thesis-Fall/Fälle wurden endgültig gelöscht.`);
      setPreviewInput(null);
      setReason("");
      setConfirmation("");
      setSecondConfirmation(false);
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const createPreview = () => {
    if (scope === "single_request") {
      const id = Number(thesisRequestId);
      if (!Number.isInteger(id) || id <= 0) {
        toast.error("Bitte geben Sie eine gültige Anfrage-ID ein.");
        return;
      }
      setPreviewInput({ scope, thesisRequestId: id });
    } else if (scope === "semester") {
      if (!semester.trim()) {
        toast.error("Bitte geben Sie das zu löschende Semester an.");
        return;
      }
      setPreviewInput({ scope, semester: semester.trim() });
    } else {
      setPreviewInput({ scope });
    }
    setReason("");
    setConfirmation("");
    setSecondConfirmation(false);
  };

  const permanentlyDelete = () => {
    if (!preview.data || preview.data.total === 0) return;
    if (reason.trim().length < 10) {
      toast.error("Bitte begründen Sie die endgültige Löschung mit mindestens zehn Zeichen.");
      return;
    }
    if (confirmation !== "ENDGUELTIG LOESCHEN" || !secondConfirmation) {
      toast.error("Bitte bestätigen Sie die Löschung mit dem vorgegebenen Text und der zweiten Sicherheitsabfrage.");
      return;
    }
    deleteMutation.mutate({
      scope: preview.data.scope,
      thesisRequestIds: preview.data.items.map((item) => item.id),
      expectedCount: preview.data.total,
      thesisRequestId: previewInput?.thesisRequestId,
      semester: previewInput?.semester,
      reason: reason.trim(),
      confirmation: "ENDGUELTIG LOESCHEN",
      secondConfirmation: true,
    });
  };

  if (loading || superadminStatus.isLoading) return <main className="min-h-screen grid place-items-center text-slate-500">Lade Löschverwaltung …</main>;
  if (!user || !superadminStatus.data?.isSuperadmin) {
    return <main className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">Zugriff nicht erlaubt</h1><p className="mt-2 text-slate-600">Diese Löschverwaltung ist ausschließlich für Superadmins verfügbar.</p><button onClick={() => setLocation("/")} className="mt-5 border border-slate-300 px-4 py-2">Zur Startseite</button></div></main>;
  }

  const previewItems = (preview.data?.items ?? []) as DeletionPreviewItem[];
  const activePreviewScope = (preview.data?.scope ?? scope) as DeletionScope;
  return (
    <main className="min-h-screen bg-[#f7f9f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div><p className="text-sm font-semibold text-[#28517a]">HTW Berlin</p><h1 className="text-xl font-semibold">Kontrollierte Datenlöschung</h1></div>
          <button onClick={() => setLocation("/superadmin")} className="text-sm text-slate-600 hover:underline">Zum Superadmin-Bereich</button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 space-y-6">
        <section className="border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Endgültige Löschung nur nach dokumentierter Freigabe</h2>
          <p className="mt-2 text-sm leading-6 text-red-900">Es gibt keinen automatischen Dreijahres-Löschlauf. Diese Funktion entfernt ausgewählte Thesis-Fälle und ihre fallbezogenen Daten dauerhaft. Prüfen Sie Aufbewahrungs-, Prüfungs- und Datenschutzvorgaben vor der Nutzung.</p>
        </section>

        <section className="bg-white border border-slate-200 p-6">
          <h2 className="text-lg font-semibold">1. Löschvorschau erstellen</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium">Löschumfang<select value={scope} onChange={(event) => { setScope(event.target.value as DeletionScope); setPreviewInput(null); }} className="mt-1 block w-full border border-slate-300 px-3 py-2"><option value="single_request">{scopeLabels.single_request}</option><option value="semester">{scopeLabels.semester}</option><option value="closed_over_three_years">{scopeLabels.closed_over_three_years}</option></select></label>
            {scope === "single_request" && <label className="text-sm font-medium">Anfrage-ID<input value={thesisRequestId} onChange={(event) => setThesisRequestId(event.target.value)} inputMode="numeric" placeholder="z. B. 1230001" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>}
            {scope === "semester" && <label className="text-sm font-medium">Semester<input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="z. B. WS2023" className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>}
            <div className="flex items-end"><button onClick={createPreview} className="w-full bg-[#28517a] px-4 py-2 text-white">Vorschau laden</button></div>
          </div>
          {scope === "closed_over_three_years" && <p className="mt-3 text-sm text-slate-600">Es werden ausschließlich Fälle mit dokumentiertem Abschlusszeitpunkt berücksichtigt, der mindestens drei Jahre zurückliegt.</p>}
        </section>

        {previewInput && <section className="bg-white border border-slate-200 p-6">
          <h2 className="text-lg font-semibold">2. Ergebnis prüfen</h2>
          {preview.isLoading ? <p className="mt-4 text-slate-500">Lade Löschvorschau …</p> : preview.error ? <p className="mt-4 text-red-700">{preview.error.message}</p> : <>
            <p className="mt-2 text-sm text-slate-600">{preview.data?.notice}</p>
            <p className="mt-3 font-medium">{preview.data?.total ?? 0} Fall/Fälle im Umfang „{scopeLabels[activePreviewScope]}“</p>
            <div className="mt-4 overflow-x-auto border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Thema</th><th className="px-3 py-2">Semester</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Abgeschlossen</th></tr></thead><tbody>{previewItems.map((item: DeletionPreviewItem) => <tr key={item.id} className="border-t border-slate-100"><td className="px-3 py-2 font-mono">{item.id}</td><td className="px-3 py-2">{item.title}</td><td className="px-3 py-2">{item.targetSemester || "—"}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.caseClosedAt || "—"}</td></tr>)}</tbody></table></div>
          </>}
        </section>}

        {preview.data && preview.data.total > 0 && <section className="border border-red-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-red-900">3. Endgültig löschen</h2>
          <p className="mt-2 text-sm text-slate-700">Die Vorschau wird unmittelbar vor der Löschung nochmals serverseitig geprüft. Der Audit-Eintrag speichert nur Umfang, Grund und verantwortliche Superadmin-Person – keine gelöschten Titel oder Personenangaben.</p>
          <label className="mt-4 block text-sm font-medium">Begründung der Löschung<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={1000} className="mt-1 block w-full border border-slate-300 px-3 py-2" placeholder="z. B. Angelegter Testfall vor Pilotbeginn" /></label>
          <label className="mt-4 block text-sm font-medium">Geben Sie zur ersten Bestätigung <code className="bg-slate-100 px-1">ENDGUELTIG LOESCHEN</code> ein.<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 block w-full border border-slate-300 px-3 py-2" /></label>
          <label className="mt-4 flex items-start gap-2 text-sm"><input checked={secondConfirmation} onChange={(event) => setSecondConfirmation(event.target.checked)} type="checkbox" className="mt-1" /><span>Ich bestätige als Superadmin, dass die angezeigten Daten endgültig gelöscht werden sollen und die Aufbewahrungsprüfung erfolgt ist.</span></label>
          <button disabled={deleteMutation.isPending} onClick={permanentlyDelete} className="mt-5 bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-50">{deleteMutation.isPending ? "Löschung läuft …" : `${preview.data.total} Fall/Fälle endgültig löschen`}</button>
        </section>}
      </div>
    </main>
  );
}
