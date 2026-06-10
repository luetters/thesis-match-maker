import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProgrammeLogo } from "@/components/ProgrammeLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Typen ────────────────────────────────────────────────────────────────────
type ExaminerRole = "first" | "second";
type ActiveTab = "unassigned" | "proposals" | "programmes" | "enrollment" | "defense" | "history" | "workflow";

// ─── OfficialStatusBadge ──────────────────────────────────────────────────────
function OfficialStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_registered: { label: "Nicht angemeldet",         cls: "bg-gray-50 text-gray-500 border-gray-200" },
    registered:     { label: "Angemeldet – Zulassung ausstehend", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    admitted:       { label: "Zugelassen",               cls: "bg-green-50 text-green-700 border-green-200" },
    case_closed:    { label: "Akte übermittelt",         cls: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── AdminWorkflowTab ─────────────────────────────────────────────────────────
// ─── PAV: Ausstehende Einladungen verwalten ───────────────────────────────────
// ─── UnassignedTab ────────────────────────────────────────────────────────────
type UnassignedSortKey = "name" | "programme" | "semester" | "title" | "date";

function UnassignedTab({
  unassigned,
  loading,
  onPropose,
  onDirectAssign,
  onEligibility,
}: {
  unassigned: any[];
  loading: boolean;
  onPropose: (id: number, title: string) => void;
  onDirectAssign: (id: number, title: string) => void;
  onEligibility: (id: number, title: string, studentName: string) => void;
}) {
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<UnassignedSortKey>("date");

  const sortOptions: { value: UnassignedSortKey; label: string }[] = [
    { value: "date", label: "Neueste zuerst" },
    { value: "name", label: "Name A–Z" },
    { value: "programme", label: "Study Programme A–Z" },
    { value: "semester", label: "Semester" },
    { value: "title", label: "Thema A–Z" },
  ];

  function extractRow(row: any) {
    const isFlat = "studentName" in row;
    return {
      id: isFlat ? row.id : row.request?.id,
      title: isFlat ? row.title : row.request?.title,
      department: isFlat ? row.department : row.request?.department,
      degreeType: isFlat ? row.degreeType : row.request?.degreeType,
      createdAt: isFlat ? row.createdAt : row.request?.createdAt,
      studentName: isFlat ? row.studentName : row.student?.name,
      targetSemester: isFlat ? row.targetSemester : row.request?.targetSemester,
      enrollElig: isFlat ? row.enrollmentEligibility : row.request?.enrollmentEligibility,
      programmeName: row.programmeName ?? null,
      programmeAbbreviation: row.programmeAbbreviation ?? null,
    };
  }

  const rows = unassigned.map(extractRow);
  const sorted = [...rows].sort((a, b) => {
    switch (sortKey) {
      case "name": return (a.studentName ?? "").localeCompare(b.studentName ?? "", "de");
      case "programme": return (a.programmeAbbreviation ?? a.programmeName ?? a.department ?? "").localeCompare(b.programmeAbbreviation ?? b.programmeName ?? b.department ?? "", "de");
      case "semester": return (a.targetSemester ?? "").localeCompare(b.targetSemester ?? "", "de");
      case "title": return (a.title ?? "").localeCompare(b.title ?? "", "de");
      case "date": return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      default: return 0;
    }
  });

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;
  }

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>{t.pav.noUnassigned}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Sortieren nach:</span>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortKey(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sortKey === opt.value
                  ? "bg-[#76B900] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4 shadow-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 truncate">{r.title || "(kein Titel)"}</p>
                {r.enrollElig && <EligibilityBadge status={r.enrollElig} type="enrollment" />}
              </div>
              {r.studentName && (
                <p className="text-sm font-medium text-[#76B900] mt-0.5">{r.studentName}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {(r.programmeAbbreviation || r.programmeName || r.department) && (
                  <span className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Study Programme:</span>{" "}
                    {r.programmeAbbreviation ?? r.programmeName ?? r.department}
                  </span>
                )}
                {r.targetSemester && (
                  <span className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Zielsemester:</span>{" "}{r.targetSemester}
                  </span>
                )}
                {r.degreeType && (
                  <span className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Abschluss:</span>{" "}{r.degreeType === "master" ? "Master" : "Bachelor"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Eingereicht: {r.createdAt ? new Date(r.createdAt).toLocaleDateString("de-DE") : "–"}</p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={() => onPropose(r.id, r.title || "(kein Titel)")}
                className="px-4 py-2 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[var(--primary)] transition-colors"
              >
                {t.pav.proposeExaminer}
              </button>
              <button
                onClick={() => onDirectAssign(r.id, r.title || "(kein Titel)")}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                {t.pav.directAssign}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PavPendingInvitationsPanel() {
  const utils = trpc.useUtils();
  const { data: drafts, isLoading } = trpc.invite.getAllDrafts.useQuery();

  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editLanguage, setEditLanguage] = useState<"de" | "en">("de");
  const [editDegreeType, setEditDegreeType] = useState<"bachelor" | "master">("bachelor");
  const [editEmail, setEditEmail] = useState("");
  const [resendEmail, setResendEmail] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState<{ id: number; title: string } | null>(null);

  const DEPT_OPTIONS = [
    { value: "FB1", label: "FB 1 – Ingenieurwissenschaften I" },
    { value: "FB2", label: "FB 2 – Ingenieurwissenschaften II" },
    { value: "FB3", label: "FB 3 – Wirtschafts- und Rechtswissenschaften" },
    { value: "FB4", label: "FB 4 – Informatik, Kommunikation und Wirtschaft" },
    { value: "FB5", label: "FB 5 – Gestaltung und Kultur" },
  ];

  const updateDraft = trpc.invite.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Einladung aktualisiert.");
      setEditId(null);
      utils.invite.getAllDrafts.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Fehler beim Aktualisieren."),
  });

  const withdrawDraft = trpc.invite.withdrawDraft.useMutation({
    onSuccess: () => {
      toast.success("Einladung zurückgezogen.");
      utils.invite.getAllDrafts.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Fehler beim Zurückziehen."),
  });

  function openEdit(d: NonNullable<typeof drafts>[0]) {
    setEditId(d.id);
    setEditTitle(d.title ?? "");
    setEditDescription((d as any).description ?? "");
    setEditDepartment(d.department ?? "");
    setEditSemester(d.targetSemester ?? "");
    setEditLanguage((d as any).language ?? "de");
    setEditDegreeType((d.degreeType as "bachelor" | "master") ?? "bachelor");
    setEditEmail((d as any).studentInviteEmail ?? "");
    setResendEmail(false);
  }

  if (isLoading) return <div className="h-16 bg-white rounded-xl animate-pulse" />;
  if (!drafts?.length) return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center text-sm text-gray-400">
      Keine ausstehenden Einladungen.
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-sm" style={{ color: "#76B900" }}>Ausstehende Einladungen ({drafts.length})</h3>
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.id}>
            {editId === d.id ? (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Einladung bearbeiten</span>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">E-Mail des Studierenden</label>
                    <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Thema</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Beschreibung</label>
                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Study Programme</label>
                      <select value={editDepartment} onChange={e => setEditDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30">
                        {DEPT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Abschlussart</label>
                      <select value={editDegreeType} onChange={e => setEditDegreeType(e.target.value as "bachelor" | "master")}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30">
                        <option value="bachelor">Bachelor</option>
                        <option value="master">Master</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={resendEmail} onChange={e => setResendEmail(e.target.checked)} className="rounded" />
                    Einladungs-E-Mail erneut senden
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditId(null)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Abbrechen
                  </button>
                  <button
                    disabled={updateDraft.isPending}
                    onClick={() => updateDraft.mutate({
                      requestId: d.id,
                      title: editTitle.trim() || undefined,
                      description: editDescription.trim() || undefined,
                      department: editDepartment || undefined,
                      targetSemester: editSemester || undefined,
                      language: editLanguage,
                      degreeType: editDegreeType,
                      studentEmail: editEmail.trim() || undefined,
                      resendEmail,
                      origin: window.location.origin,
                    })}
                    className="px-4 py-2 rounded-lg bg-[#76B900] text-white text-sm font-medium hover:bg-[#5e9200] disabled:opacity-50 transition-colors">
                    {updateDraft.isPending ? "Wird gespeichert…" : "Speichern"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500">
                    {(d as any).studentInviteEmail} · {d.targetSemester} · {d.degreeType === "master" ? "Master" : "Bachelor"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Erstgutachter:in: {(d as any).examinerName ?? "–"}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${
                    d.status === "DRAFT_BY_EXAMINER" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {d.status === "DRAFT_BY_EXAMINER" ? "Entwurf" : "Warte auf Bestätigung"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(d)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors">
                    Bearbeiten
                  </button>
                  <button
                    disabled={withdrawDraft.isPending}
                    onClick={() => setWithdrawConfirm({ id: d.id, title: d.title ?? "" })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors">
                    Zurückziehen
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bestätigungsdialog Zurückziehen */}
      <AlertDialog open={withdrawConfirm !== null} onOpenChange={(open) => { if (!open) setWithdrawConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einladung zurückziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Einladung für <strong className="text-gray-900">{withdrawConfirm?.title}</strong> wird unwiderruflich zurückgezogen.
              Der Studierende kann die Einladung danach nicht mehr annehmen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (withdrawConfirm) {
                  withdrawDraft.mutate({ requestId: withdrawConfirm.id });
                  setWithdrawConfirm(null);
                }
              }}
            >
              Ja, zurückziehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminWorkflowTab() {
  const utils = trpc.useUtils();
  const { data: theses, isLoading } = trpc.adminWorkflow.getRegisteredTheses.useQuery();
  const [selected, setSelected] = useState<number | null>(null);
  const [action, setAction] = useState<"register" | "admit" | "extend" | "defense" | "close" | null>(null);
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [defenseDate, setDefenseDate] = useState("");
  const [showHistory, setShowHistory] = useState<number | null>(null);

  const { data: deadlineHistory } = trpc.adminWorkflow.getDeadlineChanges.useQuery(
    { thesisRequestId: showHistory! },
    { enabled: showHistory !== null }
  );

  const invalidate = () => utils.adminWorkflow.getRegisteredTheses.invalidate();

  const registerMut = trpc.adminWorkflow.registerThesis.useMutation({
    onSuccess: () => { toast.success("Arbeit offiziell angemeldet."); invalidate(); setAction(null); },
    onError: (e) => toast.error(e.message),
  });
  const admitMut = trpc.adminWorkflow.admitThesis.useMutation({
    onSuccess: () => { toast.success("Thesis zugelassen."); invalidate(); setAction(null); setDeadline(""); setNote(""); },
    onError: (e) => toast.error(e.message),
  });
  const extendMut = trpc.adminWorkflow.extendDeadline.useMutation({
    onSuccess: () => { toast.success("Abgabefrist verlängert."); invalidate(); setAction(null); setDeadline(""); setReason(""); if (showHistory) utils.adminWorkflow.getDeadlineChanges.invalidate({ thesisRequestId: showHistory }); },
    onError: (e) => toast.error(e.message),
  });
  const defenseMut = trpc.adminWorkflow.setDefenseDate.useMutation({
    onSuccess: () => { toast.success("Verteidigungsdatum eingetragen."); invalidate(); setAction(null); setDefenseDate(""); },
    onError: (e) => toast.error(e.message),
  });
  const closeMut = trpc.adminWorkflow.closeCase.useMutation({
    onSuccess: () => { toast.success("Akte als vollständig übermittelt markiert."); invalidate(); setAction(null); },
    onError: (e) => toast.error(e.message),
  });

  const selectedThesis = (theses ?? []).find((t) => t.id === selected);

  function exportCsv() {
    const rows = theses ?? [];
    const headers = [
      "ID", "Titel", "Studiengang", "Abschlussart", "Studierende:r", "E-Mail",
      "Anmeldestatus", "Angemeldet am", "Abgabefrist", "Verteidigungsdatum",
      "Akte geschlossen am", "Systemstatus",
    ];
    const statusLabels: Record<string, string> = {
      not_registered: "Nicht angemeldet",
      registered: "Angemeldet \u2013 Zulassung ausstehend",
      admitted: "Zugelassen",
      rejected: "Abgelehnt",
      case_closed: "Akte vollst\u00e4ndig \u00fcbermittelt",
    };
    const escape = (v: string | null | undefined) => {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const fmt = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
    const csvLines = [
      headers.join(","),
      ...rows.map((t) =>
        [
          t.id,
          escape(t.title),
          escape(t.department),
          escape(t.degreeType),
          escape(t.studentName),
          escape(t.studentEmail),
          escape(statusLabels[t.officialRegistrationStatus ?? "not_registered"] ?? t.officialRegistrationStatus),
          fmt(t.officialRegistrationAt),
          fmt(t.submissionDeadline),
          fmt(t.defenseDate),
          fmt(t.caseClosedAt),
          escape(t.status),
        ].join(",")
      ),
    ];
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `anmeldung-zulassung-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openAction(id: number, a: typeof action) {
    setSelected(id);
    setAction(a);
    setDeadline(""); setNote(""); setReason(""); setDefenseDate("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          Übersicht aller offiziell angemeldeten und zugelassenen Abschlussarbeiten. Hier können Sie den Verwaltungsworkflow steuern.
        </div>
        {(theses ?? []).length > 0 && (
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[#5e9200] transition-colors whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV exportieren
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (theses ?? []).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">Keine Einträge vorhanden</p>
          <p className="text-sm mt-1">Sobald Studierende ihre Arbeit offiziell anmelden, erscheinen sie hier.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(theses ?? []).map((thesis) => (
            <div key={thesis.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-gray-400">#{thesis.id}</span>
                    <OfficialStatusBadge status={thesis.officialRegistrationStatus ?? "not_registered"} />
                  </div>
                  <p className="font-medium text-gray-900 truncate">{thesis.title}</p>
                  {(thesis as any).studentName && (
                    <p className="text-xs font-medium text-[#76B900] mt-0.5">{(thesis as any).studentName}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {((thesis as any).programmeAbbreviation ?? (thesis as any).programmeName ?? thesis.department) && (
                      <span className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Study Programme:</span>{" "}
                        {(thesis as any).programmeAbbreviation ?? (thesis as any).programmeName ?? thesis.department}
                      </span>
                    )}
                    {thesis.degreeType && (
                      <span className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Abschluss:</span>{" "}{thesis.degreeType === "master" ? "Master" : "Bachelor"}
                      </span>
                    )}
                    {(thesis as any).targetSemester && (
                      <span className="text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Zielsemester:</span>{" "}{(thesis as any).targetSemester}
                      </span>
                    )}
                    {(thesis as any).createdAt && (
                      <span className="text-xs text-gray-400">
                        {new Date((thesis as any).createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  {((thesis as any).firstExaminerName || (thesis as any).secondExaminerName) && (
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {(thesis as any).firstExaminerName && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Erstgutachter:in:</span>{" "}{(thesis as any).firstExaminerName}
                        </span>
                      )}
                      {(thesis as any).secondExaminerName && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Zweitgutachter:in:</span>{" "}{(thesis as any).secondExaminerName}
                        </span>
                      )}
                    </div>
                  )}
                  {thesis.submissionDeadline && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Abgabefrist: <span className="font-medium">{formatDate(thesis.submissionDeadline)}</span>
                      {thesis.defenseDate && <> · Verteidigung: <span className="font-medium">{formatDate(thesis.defenseDate)}</span></>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {thesis.officialRegistrationStatus === "not_registered" && (
                    <button onClick={() => openAction(thesis.id, "register")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors">Anmelden</button>
                  )}
                  {thesis.officialRegistrationStatus === "registered" && (
                    <button onClick={() => openAction(thesis.id, "admit")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#76B900] text-white hover:bg-[var(--primary)] transition-colors">Zulassen</button>
                  )}
                  {thesis.officialRegistrationStatus === "admitted" && (<>
                    <button onClick={() => openAction(thesis.id, "extend")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Frist verlängern</button>
                    <button onClick={() => openAction(thesis.id, "defense")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">Verteidigung</button>
                    <button onClick={() => openAction(thesis.id, "close")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors">Akte schließen</button>
                  </>)}
                  <button onClick={() => setShowHistory(showHistory === thesis.id ? null : thesis.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">Protokoll</button>
                  <a
                    href={`/api/thesis/${thesis.id}/registration.pdf`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#76B900] text-white hover:bg-[#5a8f00] transition-colors"
                    title="Anmeldedokument als PDF herunterladen (mit Verifikations-QR-Code)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Anmeldedokument
                  </a>
                </div>
              </div>
              {/* Fristprotokoll */}
              {showHistory === thesis.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Abgabefrist-Änderungsprotokoll</p>
                  {(deadlineHistory ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">Keine Friständerungen protokolliert.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(deadlineHistory ?? []).map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="text-gray-400 whitespace-nowrap">{formatDate(entry.changedAt)}</span>
                          <span className="text-gray-400">→</span>
                          <span>Frist geändert zu <strong>{formatDate(entry.newDeadline)}</strong> (vorher: {formatDate(entry.previousDeadline)}). Begründung: {entry.reason}. Von: {entry.changedByName ?? "–"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aktions-Dialog */}
      {action && selected !== null && selectedThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {action === "register" && "Arbeit offiziell anmelden"}
              {action === "admit" && "Thesis zulassen"}
              {action === "extend" && "Abgabefrist verlängern"}
              {action === "defense" && "Verteidigungsdatum eintragen"}
              {action === "close" && "Akte vollständig übermitteln"}
            </h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{selectedThesis.title}</p>

            {action === "register" && (
              <p className="text-sm text-gray-700 mb-4">Die Arbeit wird als offiziell angemeldet markiert. Zulassung ist noch ausstehend.</p>
            )}
            {(action === "admit" || action === "extend") && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {action === "admit" ? "Abgabedatum" : "Neues Abgabedatum"} <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30" />
                </div>
                {action === "admit" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hinweis (optional)</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={512}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 resize-none" />
                  </div>
                )}
                {action === "extend" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Begründung <span className="text-red-500">*</span></label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={512}
                      placeholder="z. B. Krankheit, besondere Umstände…"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 resize-none" />
                  </div>
                )}
              </div>
            )}
            {action === "defense" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Verteidigungsdatum <span className="text-red-500">*</span></label>
                <input type="date" value={defenseDate} onChange={(e) => setDefenseDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30" />
              </div>
            )}
            {action === "close" && (
              <p className="text-sm text-gray-700 mb-4">Die Akte wird als vollständig übermittelt markiert. Dieser Schritt schließt den Verwaltungsvorgang ab.</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setAction(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Abbrechen</button>
              <button
                disabled={
                  (action === "admit" && !deadline) ||
                  (action === "extend" && (!deadline || !reason.trim())) ||
                  (action === "defense" && !defenseDate) ||
                  registerMut.isPending || admitMut.isPending || extendMut.isPending || defenseMut.isPending || closeMut.isPending
                }
                onClick={() => {
                  if (action === "register") registerMut.mutate({ thesisRequestId: selected });
                  if (action === "admit") admitMut.mutate({ thesisRequestId: selected, submissionDeadline: deadline, note: note || undefined });
                  if (action === "extend") extendMut.mutate({ thesisRequestId: selected, newDeadline: deadline, reason });
                  if (action === "defense") defenseMut.mutate({ thesisRequestId: selected, defenseDate });
                  if (action === "close") closeMut.mutate({ thesisRequestId: selected });
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[var(--primary)] disabled:opacity-50 transition-colors"
              >
                {(registerMut.isPending || admitMut.isPending || extendMut.isPending || defenseMut.isPending || closeMut.isPending) ? "Wird gespeichert…" : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Ausstehend", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    accepted: { label: "Angenommen", cls: "bg-primary/5 text-primary border-primary/20" },
    declined: { label: "Abgelehnt",  cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function EligibilityBadge({ status, type }: { status: string; type: "enrollment" | "defense" }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:        { label: "Ausstehend",    cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    approved:       { label: "Freigegeben",   cls: "bg-green-50 text-green-700 border-green-200" },
    rejected:       { label: "Abgelehnt",     cls: "bg-red-50 text-red-700 border-red-200" },
    blocked:        { label: "Blockiert",     cls: "bg-red-50 text-red-700 border-red-200" },
    not_applicable: { label: "Nicht relevant", cls: "bg-gray-50 text-gray-500 border-gray-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── EligibilityActionDialog ──────────────────────────────────────────────────
function EligibilityActionDialog({
  thesisRequestId,
  thesisTitle,
  studentName,
  type,
  onClose,
}: {
  thesisRequestId: number;
  thesisTitle: string;
  studentName: string;
  type: "enrollment" | "defense";
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const setEnrollment = trpc.pav.setEnrollmentEligibility.useMutation({
    onSuccess: () => {
      toast.success(action === "approve" ? "Anmeldefähigkeit bestätigt." : "Anmeldefähigkeit abgelehnt.");
      utils.pav.getPendingEnrollmentEligibility.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const setDefense = trpc.pav.setDefenseEligibility.useMutation({
    onSuccess: () => {
      toast.success(action === "approve" ? "Prüfungsfähigkeit bestätigt." : "Prüfungsfähigkeit blockiert.");
      utils.pav.getPendingDefenseEligibility.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = setEnrollment.isPending || setDefense.isPending;

  // Pflichtfeld: Begründung bei Ablehnung/Blockierung
  const requiresNote = action === "reject";
  const noteIsEmpty = note.trim().length === 0;
  const canSubmit = action !== null && !(requiresNote && noteIsEmpty);

  function handleSubmit() {
    if (!action || !canSubmit) return;
    if (type === "enrollment") {
      setEnrollment.mutate({
        thesisRequestId,
        eligibility: action === "approve" ? "approved" : "rejected",
        note: note.trim() || undefined,
      });
    } else {
      setDefense.mutate({
        thesisRequestId,
        eligibility: action === "approve" ? "approved" : "blocked",
        note: note.trim() || undefined,
      });
    }
  }

  const isEnrollment = type === "enrollment";
  const approveLabel = isEnrollment ? "Anmeldefähigkeit bestätigen" : "Prüfungsfähigkeit bestätigen";
  const rejectLabel  = isEnrollment ? "Anmeldefähigkeit ablehnen"   : "Prüfungsfähigkeit blockieren";
  const title        = isEnrollment ? "Anmeldefähigkeit prüfen"     : "Prüfungsfähigkeit prüfen";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-1 line-clamp-2">{thesisTitle}</p>
        <p className="text-xs text-gray-400 mb-4">Studierende:r: {studentName}</p>

        {isEnrollment ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4 text-xs text-blue-700">
            Hat die Person genügend Credits erworben, um sich für die Abschlussarbeit anzumelden?
            Bei Ablehnung wird der Platz wieder freigegeben.
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700">
            Sind alle Prüfungsleistungen erbracht? Sind noch offene Prüfungen vorhanden,
            darf das Kolloquium nicht stattfinden (Student not legally qualified to take final exam).
          </div>
        )}

        {/* Aktionsauswahl */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAction("approve")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              action === "approve"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700"
            }`}
          >
            ✓ {approveLabel}
          </button>
          <button
            onClick={() => setAction("reject")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              action === "reject"
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-700"
            }`}
          >
            ✕ {rejectLabel}
          </button>
        </div>

        {/* Begründung */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Begründung
            {action === "reject" ? (
              <span className="ml-1 text-red-600 font-semibold">*</span>
            ) : (
              <span className="ml-1 text-gray-400 font-normal">(optional)</span>
            )}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={512}
            placeholder={action === "reject" ? "Pflichtfeld: Bitte geben Sie eine Begründung für die Ablehnung an…" : "Begründung für die Entscheidung (optional)…"}
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
              action === "reject" && noteIsEmpty
                ? "border-red-300 focus:ring-red-200 bg-red-50/30"
                : "border-gray-200 focus:ring-primary/20"
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {action === "reject" && noteIsEmpty ? (
              <p className="text-xs text-red-600">Eine Begründung ist bei Ablehnung erforderlich.</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-400">{note.length}/512</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            disabled={!canSubmit || isPending}
            onClick={handleSubmit}
            title={requiresNote && noteIsEmpty ? "Bitte geben Sie zuerst eine Begründung ein." : undefined}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isPending ? "Wird gespeichert…" : "Entscheidung speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ProposeDialog ────────────────────────────────────────────────────────────
function ProposeDialog({
  thesisRequestId,
  thesisTitle,
  onClose,
}: {
  thesisRequestId: number;
  thesisTitle: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [examinerId, setExaminerId] = useState<number | "">("");
  const [examinerRole, setExaminerRole] = useState<ExaminerRole>("first");

  const { data: examiners } = trpc.examiner.list.useQuery();
  const propose = trpc.pav.proposeExaminer.useMutation({
    onSuccess: () => {
      toast.success("Anfrage erfolgreich versendet.");
      utils.pav.getProposals.invalidate();
      utils.pav.getUnassignedStudents.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Prüfer:in vorschlagen</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{thesisTitle}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <div className="flex gap-2">
              {(["first", "second"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setExaminerRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    examinerRole === r
                      ? r === "first" ? "bg-primary text-white border-primary" : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {r === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prüfer:in auswählen</label>
            <select
              value={examinerId}
              onChange={(e) => setExaminerId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">– Bitte auswählen –</option>
              {(examiners ?? [])
                .filter((ex) => {
                  if (examinerRole === "first") return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer !== 1;
                  return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer === 1;
                })
                .map((ex) => (
                  <option key={ex.user?.id} value={ex.user?.id ?? 0}>
                    {ex.profile?.title ? `${ex.profile.title} ` : ""}{ex.user?.name ?? "–"}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            disabled={!examinerId || propose.isPending}
            onClick={() => {
              if (!examinerId) return;
              propose.mutate({ thesisRequestId, examinerId: Number(examinerId), examinerRole, origin: window.location.origin });
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[var(--primary)] disabled:opacity-50 transition-colors"
          >
            {propose.isPending ? "Wird gesendet…" : "Anfrage senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DirectAssignDialog ──────────────────────────────────────────────────────
function DirectAssignDialog({
  thesisRequestId,
  thesisTitle,
  onClose,
}: {
  thesisRequestId: number;
  thesisTitle: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [examinerId, setExaminerId] = useState<number | "">("");
  const [examinerRole, setExaminerRole] = useState<ExaminerRole>("first");

  const { data: examiners } = trpc.examiner.list.useQuery();
  const directAssign = trpc.pav.directAssignExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in wurde direkt zugewiesen.");
      utils.pav.getUnassignedStudents.invalidate();
      utils.pav.getProposals.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Prüfer:in direkt zuweisen</h3>
        <p className="text-sm text-gray-500 mb-1 line-clamp-2">{thesisTitle}</p>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Die Zuweisung erfolgt sofort und verbindlich – ohne Rückfrage an die Prüfer:in.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <div className="flex gap-2">
              {(["first", "second"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setExaminerRole(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    examinerRole === r
                      ? r === "first" ? "bg-primary text-white border-primary" : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {r === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prüfer:in auswählen</label>
            <select
              value={examinerId}
              onChange={(e) => setExaminerId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">– Bitte auswählen –</option>
              {(examiners ?? [])
                .filter((ex) => {
                  if (examinerRole === "first") return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer !== 1;
                  return (ex.profile as { isSecondExaminer?: number } | null)?.isSecondExaminer === 1;
                })
                .map((ex) => (
                  <option key={ex.user?.id} value={ex.user?.id ?? 0}>
                    {ex.profile?.title ? `${ex.profile.title} ` : ""}{ex.user?.name ?? "–"}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            disabled={!examinerId || directAssign.isPending}
            onClick={() => {
              if (!examinerId) return;
              directAssign.mutate({ thesisRequestId, examinerId: Number(examinerId), examinerRole });
            }}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {directAssign.isPending ? "Wird zugewiesen…" : "Direkt zuweisen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DecisionHistoryTab ─────────────────────────────────────────────────────
function DecisionHistoryTab() {
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [searchId, setSearchId] = useState("");

  const { data: history, isLoading } = trpc.pav.getDecisionHistory.useQuery(
    { thesisRequestId: selectedRequestId! },
    { enabled: selectedRequestId !== null }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(searchId.trim(), 10);
    if (!isNaN(id) && id > 0) setSelectedRequestId(id);
  }

  const decisionLabel: Record<string, { label: string; cls: string }> = {
    approved: { label: "Freigegeben", cls: "bg-green-50 text-green-700 border-green-200" },
    rejected: { label: "Abgelehnt",   cls: "bg-red-50 text-red-700 border-red-200" },
    blocked:  { label: "Blockiert",   cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const typeLabel: Record<string, string> = {
    enrollment_eligibility: "Anmeldefs\u00e4higkeit",
    defense_eligibility:    "Pr\u00fcfungsf\u00e4higkeit",
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700">
        Geben Sie die Antrags-ID ein, um die Entscheidungshistorie eines Antrags einzusehen.
      </div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="number"
          min="1"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Antrags-ID eingeben"
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[var(--primary)] transition-colors"
        >
          Suchen
        </button>
      </form>

      {selectedRequestId !== null && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Antrag #{selectedRequestId}</p>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
          ) : (history ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Keine Entscheidungen f\u00fcr diesen Antrag gefunden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(history ?? []).map((entry) => {
                const d = decisionLabel[entry.decision] ?? { label: entry.decision, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                return (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-gray-800">{typeLabel[entry.decisionType] ?? entry.decisionType}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${d.cls}`}>{d.label}</span>
                        </div>
                        {entry.note && (
                          <p className="text-xs text-gray-500 mt-1">Begr\u00fcndung: {entry.note}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Entschieden von: {entry.decidedByName ?? entry.decidedByEmail ?? "Unbekannt"}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(entry.decidedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PavDashboard() {
  const { user, loading, hasRole } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>("unassigned");
  const [proposeFor, setProposeFor] = useState<{ id: number; title: string } | null>(null);
  const [directAssignFor, setDirectAssignFor] = useState<{ id: number; title: string } | null>(null);
  const [eligibilityFor, setEligibilityFor] = useState<{
    id: number; title: string; studentName: string; type: "enrollment" | "defense";
  } | null>(null);

  const { data: unassigned, isLoading: loadingUnassigned } = trpc.pav.getUnassignedStudentsFiltered.useQuery(undefined, { enabled: !!user });
  const { data: proposals, isLoading: loadingProposals } = trpc.pav.getProposals.useQuery(undefined, { enabled: !!user });
  const { data: myProgrammes, refetch: refetchProgrammes } = trpc.pav.getProgrammes.useQuery(undefined, { enabled: !!user });
  const { data: allProgrammes } = trpc.programmes.list.useQuery();
  const { data: pendingEnrollment, isLoading: loadingEnrollment } = trpc.pav.getPendingEnrollmentEligibility.useQuery(undefined, { enabled: !!user });
  const { data: pendingDefense, isLoading: loadingDefense } = trpc.pav.getPendingDefenseEligibility.useQuery(undefined, { enabled: !!user });

  const addProg = trpc.pav.addProgramme.useMutation({ onSuccess: () => refetchProgrammes() });
  const removeProg = trpc.pav.removeProgramme.useMutation({ onSuccess: () => refetchProgrammes() });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (!hasRole("pav") && !hasRole("admin") && !hasRole("superadmin"))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sie haben keinen Zugriff auf diesen Bereich.</p>
          <Link href="/" className="text-[#76B900] hover:underline text-sm">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const pendingCount = (proposals ?? []).filter((p) => p.proposal.status === "pending").length;
  const enrollmentCount = (pendingEnrollment ?? []).length;
  const defenseCount = (pendingDefense ?? []).length;

  const tabs: { id: ActiveTab; label: string; badge?: number }[] = [
    { id: "unassigned",  label: t.pav.unassigned },
    { id: "proposals",   label: "Vorschläge", badge: pendingCount },
    { id: "enrollment",  label: "Anmeldefsähigkeit", badge: enrollmentCount },
    { id: "defense",     label: "Prüfungsfähigkeit", badge: defenseCount },
    { id: "workflow",    label: "Anmeldung & Zulassung" },
    { id: "history",     label: "Entscheidungshistorie" },
    { id: "programmes",  label: t.pav.myProgrammes },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">PA-Vorsitz</h1>
              <p className="text-xs text-gray-500">Prüfungsausschuss-Dashboard</p>
            </div>
          </div>
          <span className="text-sm text-gray-500">{user.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-[#76B900] text-[#76B900]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400 text-white text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Tab: Unzugeteilte Studierende */}
        {activeTab === "unassigned" && (
          <UnassignedTab
            unassigned={unassigned ?? []}
            loading={loadingUnassigned}
            onPropose={(id, title) => setProposeFor({ id, title })}
            onDirectAssign={(id, title) => setDirectAssignFor({ id, title })}
            onEligibility={(id, title, studentName) => setEligibilityFor({ id, title, studentName, type: "enrollment" })}
          />
        )}

        {/* Tab: Meine Vorschläge */}
        {activeTab === "proposals" && (
          <>
            {loadingProposals ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
            ) : (proposals ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400"><p>Noch keine Vorschläge unterbreitet.</p></div>
            ) : (
              <div className="space-y-3">
                {(proposals ?? []).map(({ proposal, request }) => (
                  <div key={proposal.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{request.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {t.pav.role}: {proposal.examinerRole === "first" ? t.pav.firstExaminer : t.pav.secondExaminer} ·
                          Gesendet: {formatDate(proposal.emailSentAt)}
                        </p>
                        {proposal.declineReason && (
                          <p className="text-xs text-red-500 mt-1">Ablehnungsgrund: {proposal.declineReason}</p>
                        )}
                      </div>
                      <StatusBadge status={proposal.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Anmeldefähigkeit */}
        {activeTab === "enrollment" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <strong>Anmeldefähigkeit:</strong> Prüfen Sie, ob die Studierenden genügend Credits erworben haben,
              um sich für eine Abschlussarbeit anzumelden. Bei Ablehnung wird der Platz wieder freigegeben.
            </div>
            {loadingEnrollment ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
            ) : (pendingEnrollment ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Keine ausstehenden Anmeldefähigkeitsprüfungen.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(pendingEnrollment ?? []).map(({ request, student }) => (
                  <div key={request.id} className="bg-white rounded-xl border border-yellow-200 p-4 flex items-start justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{request.title || "(kein Titel)"}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {student.name ?? "–"} · {student.matrikelNr ? `Matr.-Nr. ${student.matrikelNr}` : "keine Matr.-Nr."}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Eingereicht: {formatDate(request.createdAt)} · {request.degreeType === "master" ? "Master" : "Bachelor"}
                      </p>
                    </div>
                    <button
                      onClick={() => setEligibilityFor({
                        id: request.id,
                        title: request.title || "(kein Titel)",
                        studentName: student.name ?? "–",
                        type: "enrollment",
                      })}
                      className="shrink-0 px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors"
                    >
                      Prüfen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Prüfungsfähigkeit */}
        {activeTab === "defense" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <strong>Prüfungsfähigkeit:</strong> Prüfen Sie, ob alle Prüfungsleistungen erbracht wurden.
              Sind noch offene Prüfungen vorhanden, darf das Kolloquium nicht stattfinden
              (<em>Student not legally qualified to take final exam</em>).
            </div>
            {loadingDefense ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
            ) : (pendingDefense ?? []).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Keine ausstehenden Prüfungsfähigkeitsprüfungen.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(pendingDefense ?? []).map(({ request, student }) => (
                  <div key={request.id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-start justify-between gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{request.title || "(kein Titel)"}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {student.name ?? "–"} · {student.matrikelNr ? `Matr.-Nr. ${student.matrikelNr}` : "keine Matr.-Nr."}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Eingereicht: {formatDate(request.createdAt)} · {request.degreeType === "master" ? "Master" : "Bachelor"}
                      </p>
                      {request.defenseEligibilityNote && (
                        <p className="text-xs text-amber-600 mt-1">Hinweis: {request.defenseEligibilityNote}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setEligibilityFor({
                        id: request.id,
                        title: request.title || "(kein Titel)",
                        studentName: student.name ?? "–",
                        type: "defense",
                      })}
                      className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      Prüfen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Anmeldung & Zulassung */}
        {activeTab === "workflow" && (
          <div className="space-y-6">
            <PavPendingInvitationsPanel />
            <AdminWorkflowTab />
          </div>
        )}
        {/* Tab: Entscheidungshistorie */}
        {activeTab === "history" && <DecisionHistoryTab />}

        {/* Tab: Meine Studiengänge */}
        {activeTab === "programmes" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t.pav.proposalNote}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(allProgrammes ?? []).map((prog) => {
                const isAssigned = (myProgrammes ?? []).some((p) => p.programmeId === prog.id);
                return (
                  <div
                    key={prog.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      isAssigned ? "border-[#76B900] bg-primary/5" : "border-gray-200 bg-white"
                    } shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ProgrammeLogo abbreviation={(prog as any).abbreviation ?? ''} pictogramUrl={(prog as any).pictogramUrl} size="lg" />
                      <div>
                        <p className="font-medium text-gray-900">{prog.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{prog.level === "master" ? t.pav.master : t.pav.bachelor} · {prog.abbreviation}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => isAssigned ? removeProg.mutate({ programmeId: prog.id }) : addProg.mutate({ programmeId: prog.id })}
                      disabled={addProg.isPending || removeProg.isPending}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isAssigned ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#76B900] text-white hover:bg-[var(--primary)]"
                      } disabled:opacity-50`}
                    >
                      {isAssigned ? t.pav.removeProgramme : t.pav.addProgramme}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialoge */}
      {proposeFor && (
        <ProposeDialog thesisRequestId={proposeFor.id} thesisTitle={proposeFor.title} onClose={() => setProposeFor(null)} />
      )}
      {directAssignFor && (
        <DirectAssignDialog thesisRequestId={directAssignFor.id} thesisTitle={directAssignFor.title} onClose={() => setDirectAssignFor(null)} />
      )}
      {eligibilityFor && (
        <EligibilityActionDialog
          thesisRequestId={eligibilityFor.id}
          thesisTitle={eligibilityFor.title}
          studentName={eligibilityFor.studentName}
          type={eligibilityFor.type}
          onClose={() => setEligibilityFor(null)}
        />
      )}
    </div>
  );
}
