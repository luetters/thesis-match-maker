import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const DEPARTMENTS = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;
const toInputValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function DeadlineManagementTab() {
  const { user } = useAuth();
  const isSuperadmin = ((user as any)?.roles ?? [user?.role]).includes("superadmin");
  const ownDepartment = (user as any)?.department as string | undefined;
  const [department, setDepartment] = useState<string>(ownDepartment && DEPARTMENTS.includes(ownDepartment as any) ? ownDepartment : "FB3");
  const [programmeId, setProgrammeId] = useState<string>("standard");
  const [semester, setSemester] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = (trpc as any).deadlines.list.useQuery();
  const { data: programmes = [] } = trpc.programmes.list.useQuery();
  const filteredProgrammes = useMemo(() => (programmes as any[]).filter((programme) => programme.fachbereich === department), [programmes, department]);
  const saveRule = (trpc as any).deadlines.saveRule.useMutation({
    onSuccess: () => {
      toast.success("Fristenregel gespeichert.");
      utils.invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setProgrammeId("standard"); setSemester(""); setRegistrationDeadline(""); setSubmissionDeadline("");
  };
  const edit = (rule: any) => {
    setDepartment(rule.department);
    setProgrammeId(rule.programmeId ? String(rule.programmeId) : "standard");
    setSemester(rule.semester);
    setRegistrationDeadline(toInputValue(rule.registrationDeadline));
    setSubmissionDeadline(toInputValue(rule.submissionDeadline));
  };
  const submit = () => {
    if (!semester || !registrationDeadline || !submissionDeadline) return toast.error("Bitte füllen Sie Semester sowie beide Fristen aus.");
    saveRule.mutate({
      department: department as any,
      programmeId: programmeId === "standard" ? null : Number(programmeId),
      semester,
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      submissionDeadline: new Date(submissionDeadline).toISOString(),
    });
  };

  return <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5"><h2 className="text-lg font-semibold text-gray-900">Regelfristen hinterlegen</h2><p className="mt-1 text-sm text-gray-600">Die Fachbereichsregel gilt für alle Studiengänge, sofern keine studiengangsspezifische Regel für dasselbe Semester existiert.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-medium text-gray-700">Fachbereich
          <select value={department} disabled={!isSuperadmin} onChange={(event) => { setDepartment(event.target.value); setProgrammeId("standard"); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm disabled:bg-gray-100">
            {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Studiengang
          <select value={programmeId} onChange={(event) => setProgrammeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
            <option value="standard">Fachbereichsstandard (alle Studiengänge)</option>
            {filteredProgrammes.map((programme: any) => <option key={programme.id} value={String(programme.id)}>{programme.abbreviation} · {programme.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">Semester
          <input value={semester} onChange={(event) => setSemester(event.target.value)} placeholder="z. B. WS2026" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">Anmeldefrist
          <input type="datetime-local" value={registrationDeadline} onChange={(event) => setRegistrationDeadline(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm font-medium text-gray-700">Regel-Abgabefrist
          <input type="datetime-local" value={submissionDeadline} onChange={(event) => setSubmissionDeadline(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={submit} disabled={saveRule.isPending} className="rounded-xl bg-[#76B900] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a8c00] disabled:opacity-50">{saveRule.isPending ? "Wird gespeichert …" : "Frist speichern"}</button><button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Eingabe leeren</button></div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4"><h2 className="font-semibold text-gray-900">Hinterlegte Regelfristen</h2></div>
      {isLoading ? <p className="p-6 text-sm text-gray-500">Fristen werden geladen …</p> : !rules.length ? <p className="p-6 text-sm text-gray-500">Für Ihren Fachbereich sind noch keine Fristen hinterlegt.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="px-5 py-3">Fachbereich</th><th className="px-5 py-3">Studiengang</th><th className="px-5 py-3">Semester</th><th className="px-5 py-3">Anmeldung</th><th className="px-5 py-3">Abgabe</th><th className="px-5 py-3" /></tr></thead><tbody>{rules.map((rule: any) => <tr key={rule.id} className="border-t border-gray-100 text-sm text-gray-700"><td className="px-5 py-3 font-semibold">{rule.department}</td><td className="px-5 py-3">{rule.programmeId ? `${rule.programmeAbbreviation ?? ""} ${rule.programmeName ?? ""}`.trim() : "Fachbereichsstandard"}</td><td className="px-5 py-3">{rule.semester}</td><td className="px-5 py-3">{new Date(rule.registrationDeadline).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-5 py-3">{new Date(rule.submissionDeadline).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-5 py-3 text-right"><button onClick={() => edit(rule)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#4a7200] hover:bg-[#76B900]/10">Bearbeiten</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
