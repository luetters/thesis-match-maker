import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { InvolvedPersonsTable, type PersonRow } from "@/components/InvolvedPersonsTable";
import { RequestDetailModal } from "@/components/RequestDetailModal";
import Profile from "@/pages/Profile";
import SupervisionCapacities from "@/pages/SupervisionCapacities";
import { ExaminerProgrammeSelector } from "@/components/ProgrammeSelector";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/UserAvatar";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { buildFullName } from "@shared/const";
import { RegistrationPdfPreviewModal } from "@/components/RegistrationPdfPreviewModal";
import { DocComments } from "@/components/DocComments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  inbox: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

const Icons2 = {
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  history: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};
// ─── Semester-Optionen ───────────────────────────────────────────────────────
function getNextSemesters(): { label: string; value: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let startYear = currentYear;
  let startSemester = currentMonth >= 10 ? "WS" : currentMonth >= 4 ? "SoSe" : "WS";
  if (startSemester === "WS" && currentMonth < 10) startYear -= 1;
  const semesters = [];
  for (let i = 0; i < 6; i++) {
    if (startSemester === "WS") {
      semesters.push({ label: `WS ${startYear}/${startYear + 1}`, value: `WS${startYear}` });
      startYear += 1;
      startSemester = "SoSe";
    } else {
      semesters.push({ label: `SoSe ${startYear}`, value: `SoSe${startYear}` });
      startSemester = "WS";
    }
  }
  return semesters;
}

const DEPT_OPTIONS = [
  { value: "FB1", label: "FB 1 – Ingenieurwissenschaften I" },
  { value: "FB2", label: "FB 2 – Ingenieurwissenschaften II" },
  { value: "FB3", label: "FB 3 – Wirtschafts- und Rechtswissenschaften" },
  { value: "FB4", label: "FB 4 – Informatik, Kommunikation und Wirtschaft" },
  { value: "FB5", label: "FB 5 – Gestaltung und Kultur" },
];

// ─── Studierende einladen (Formular) ─────────────────────────────────────────
function InviteStudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [emailLang, setEmailLang] = useState<"de" | "en">("de");

  const sendInvite = trpc.invite.sendRegistrationInvite.useMutation({
    onSuccess: () => {
      toast.success("Einladung wurde erfolgreich versandt. Der Studierende erhält eine E-Mail mit einem direkten Registrierungslink.");
      setOpen(false);
      setStudentEmail("");
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message ?? "Fehler beim Versenden der Einladung."),
  });

  const canSubmit = studentEmail.trim().length > 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#76B900" }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Studierende einladen
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ color: "#76B900" }}>Studierende zur Registrierung einladen</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <p className="text-sm text-gray-500">
        Tragen Sie die E-Mail-Adresse des Studierenden ein. Der Studierende erhält eine E-Mail mit einem direkten Registrierungslink
        und wird nach der Registrierung automatisch freigeschaltet. Alle weiteren Angaben nimmt der Studierende selbst vor.
      </p>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">E-Mail-Adresse des Studierenden <span className="text-red-500">*</span></Label>
          <Input
            type="email"
            value={studentEmail}
            onChange={e => setStudentEmail(e.target.value)}
            placeholder="vorname.nachname@student.htw-berlin.de"
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Sprache der Einladungs-E-Mail</Label>
          <Select value={emailLang} onValueChange={v => setEmailLang(v as "de" | "en")}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={() => setOpen(false)} className="text-sm">Abbrechen</Button>
        <Button
          disabled={!canSubmit || sendInvite.isPending}
          onClick={() => sendInvite.mutate({ studentEmail: studentEmail.trim(), emailLang, origin: window.location.origin })}
          className="text-sm text-white"
          style={{ backgroundColor: "#76B900" }}
        >
          {sendInvite.isPending ? "Wird gesendet…" : "Einladung versenden"}
        </Button>
      </div>
    </div>
  );
}

// ─── Ausstehende Einladungen verwalten ───────────────────────────────────────
function PendingInvitationsPanel({ onChanged }: { onChanged?: () => void }) {
  const utils = trpc.useUtils();
  const { data: drafts, isLoading } = trpc.invite.getMyDrafts.useQuery();

  // Edit-State
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

  const updateDraft = trpc.invite.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Einladung wurde aktualisiert.");
      setEditId(null);
      utils.invite.getMyDrafts.invalidate();
      onChanged?.();
    },
    onError: (err) => toast.error(err.message ?? "Fehler beim Aktualisieren."),
  });

  const withdrawDraft = trpc.invite.withdrawDraft.useMutation({
    onSuccess: () => {
      toast.success("Einladung wurde zurückgezogen.");
      utils.invite.getMyDrafts.invalidate();
      onChanged?.();
    },
    onError: (err) => toast.error(err.message ?? "Fehler beim Zurückziehen."),
  });

  const semesters = getNextSemesters();

  function openEdit(d: NonNullable<typeof drafts>[0]) {
    setEditId(d.id);
    setEditTitle(d.title ?? "");
    setEditDescription(d.description ?? "");
    setEditDepartment(d.department ?? "");
    setEditSemester(d.targetSemester ?? "");
    setEditLanguage((d.language as "de" | "en") ?? "de");
    setEditDegreeType((d.degreeType as "bachelor" | "master") ?? "bachelor");
    setEditEmail((d as any).studentInviteEmail ?? "");
    setResendEmail(false);
  }

  if (isLoading) return null;
  if (!drafts?.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold" style={{ color: "#76B900" }}>Ausstehende Einladungen</h2>
      <p className="text-xs text-gray-500">Diese Einladungen wurden versandt, aber noch nicht von der/dem Studierenden bestätigt.</p>
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.id}>
            {editId === d.id ? (
              // ── Bearbeiten-Formular ──────────────────────────────────────
              <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Einladung bearbeiten</span>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600">E-Mail-Adresse des Studierenden</Label>
                    <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600">Thema</Label>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600">Beschreibung</Label>
                    <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className="text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600">Fachbereich</Label>
                      <Select value={editDepartment} onValueChange={setEditDepartment}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{DEPT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600">Zielsemester</Label>
                      <Select value={editSemester} onValueChange={setEditSemester}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600">Abschlussart</Label>
                      <Select value={editDegreeType} onValueChange={v => setEditDegreeType(v as "bachelor" | "master")}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bachelor">Bachelor</SelectItem>
                          <SelectItem value="master">Master</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-gray-600">Sprache</Label>
                      <Select value={editLanguage} onValueChange={v => setEditLanguage(v as "de" | "en")}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="de">Deutsch</SelectItem>
                          <SelectItem value="en">Englisch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={resendEmail} onChange={e => setResendEmail(e.target.checked)} className="rounded" />
                    Einladungs-E-Mail erneut senden
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditId(null)}>Abbrechen</Button>
                  <Button
                    size="sm"
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
                    className="text-white"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    {updateDraft.isPending ? "Wird gespeichert…" : "Speichern"}
                  </Button>
                </div>
              </div>
            ) : (
              // ── Listenzeile ─────────────────────────────────────────────
              <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-500">
                    {(d as any).studentInviteEmail} · {d.targetSemester} · {d.degreeType === "master" ? "Master" : "Bachelor"}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      d.status === "DRAFT_BY_EXAMINER" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {d.status === "DRAFT_BY_EXAMINER" ? "Entwurf" : "Warte auf Bestätigung"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => openEdit(d)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    disabled={withdrawDraft.isPending}
                    onClick={() => setWithdrawConfirm({ id: d.id, title: d.title ?? "" })}
                  >
                    Zurückziehen
                  </Button>
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

function useNavItems() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isFirstExaminer = user?.role === "examiner" || user?.role === "admin" || user?.role === "superadmin";
  const items = [
    { href: "/examiner", label: "Übersicht", icon: Icons.home },
    { href: "/examiner/requests", label: t.examiner.requests, icon: Icons.inbox },
    { href: "/examiner/topics", label: "Meine Themen", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
    { href: "/examiner/history", label: t.examiner.history, icon: Icons2.history },
    { href: "/examiner/colloquiums", label: t.examiner.colloquiums, icon: Icons2.calendar },
    { href: "/examiner/capacities", label: t.supervisionCapacitiesPage.navLabel, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { href: "/examiner/profile", label: t.examiner.profile, icon: Icons.profile },
  ];
  return items;
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function PdfPreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col"
        style={{ height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Exposé Vorschau</span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: "#F1F8E9", color: "#76B900" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Herunterladen
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          <iframe
            src={url}
            className="w-full h-full"
            title="Exposé PDF"
          />
        </div>
      </div>
    </div>
  );
}

/** Kleine Formatierungs-Toolbar für Notiz-Textareas */
function FormatToolbar({ onBold, onItalic, onBullet }: { onBold: () => void; onItalic: () => void; onBullet: () => void }) {
  return (
    <div className="flex items-center gap-0.5 border border-gray-200 rounded-t-lg bg-gray-50 px-2 py-1">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onBold(); }}
        title="Fett (Strg+B)"
        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-600 font-bold text-xs w-6 h-6 flex items-center justify-center"
      >B</button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onItalic(); }}
        title="Kursiv (Strg+I)"
        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-600 italic text-xs w-6 h-6 flex items-center justify-center"
      >I</button>
      <div className="w-px h-4 bg-gray-300 mx-0.5" />
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onBullet(); }}
        title="Aufzählungszeichen"
        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-600 text-xs w-6 h-6 flex items-center justify-center"
      >•</button>
      <span className="ml-auto text-[10px] text-gray-400 select-none">Markdown</span>
    </div>
  );
}

/** Rendert einfaches Markdown (Fett, Kursiv, Aufzählungen) als HTML */
function MarkdownNote({ content }: { content: string }) {
  const html = content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => {
      const isBullet = line.trimStart().startsWith("- ");
      let l = isBullet ? line.replace(/^(\s*)- /, "$1") : line;
      l = l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      l = l.replace(/_(.+?)_/g, "<em>$1</em>");
      return isBullet ? `<li class="ml-4 list-disc">${l}</li>` : `<span>${l}</span>`;
    })
    .join("\n");
  return <div className="text-sm text-gray-800 space-y-0.5 [&_li]:list-disc [&_li]:ml-4" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── SecondExaminerRequestBox ─────────────────────────────────────────────────
function SecondExaminerRequestBox({ req, openEmailDialog, isPending }: {
  req: any;
  openEmailDialog: (action: "accept" | "reject" | "fully_booked") => void;
  isPending: boolean;
}) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <div className="space-y-3">
      {/* Info-Box */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Anfrage als Zweitgutachter:in
        </p>
        <p className="text-xs text-blue-700">Sie wurden als Zweitgutachter:in für diese Abschlussarbeit angefragt.</p>
      </div>

      {/* Erstgutachter-Anmerkungen */}
      {req.conditionalAcceptanceReason && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vorbehalt des Erstgutachters
          </p>
          <p className="text-xs text-amber-700">{req.conditionalAcceptanceReason}</p>
          {req.conditionalAcceptanceAt && (
            <p className="text-[10px] text-amber-500 mt-1">Erteilt am {new Date(req.conditionalAcceptanceAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr</p>
          )}
        </div>
      )}

      {/* Ablehnungsgrund-Textfeld */}
      {showRejectReason && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700">Begründung der Ablehnung <span className="font-normal text-gray-400">(optional – wird dem/der Studierenden per E-Mail mitgeteilt)</span></label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-red-300"
            placeholder="Optionale Begründung für die Ablehnung ..."
          />
        </div>
      )}

      {/* Erstgutachter:in kontaktieren */}
      {req.firstExaminerEmail && (
        <button
          onClick={() => {
            const firstName = req.firstExaminerName ?? "Erstgutachter:in";
            const subject = `Rückfrage zur Zweitbetreuung – ${req.title}`;
            const body =
              `Sehr geehrte/r ${firstName},\n\n` +
              `ich wurde als Zweitgutachter:in für die Abschlussarbeit \u201e${req.title}\u201c von ${req.studentName ?? "dem/der Studierenden"} angefragt.\n\n` +
              `Ich möchte mich kurz bei Ihnen melden:\n\n` +
              `Mit freundlichen Grüßen`;
            (req as any)._contactFirstExaminer = { subject, body };
            openEmailDialog("accept");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Erstgutachter:in kontaktieren
        </button>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => openEmailDialog("accept")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#76B900" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Annehmen
        </button>
        {!showRejectReason ? (
          <button
            onClick={() => setShowRejectReason(true)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Ablehnen
          </button>
        ) : (
          <button
            onClick={() => {
              (req as any)._rejectReason = rejectReason;
              openEmailDialog("reject");
            }}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Ablehnen & senden
          </button>
        )}
      </div>
    </div>
  );
}

function ConditionalReasonBox({ requestId, reason, conditionalAt, onUpdated }: { requestId: number; reason: string; conditionalAt?: string | null; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(reason);
  const updateMutation = trpc.examinerEmailTemplates.updateConditionalReason.useMutation({
    onSuccess: () => { setEditing(false); onUpdated(); toast.success("Vorbehalt aktualisiert."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const liftMutation = (trpc.examinerEmailTemplates as any).liftConditional?.useMutation?.({
    onSuccess: () => { onUpdated(); toast.success("Vorbehalt aufgehoben – reguläre Zusage erteilt."); },
    onError: (e: any) => toast.error(e.message ?? "Fehler beim Aufheben des Vorbehalts."),
  });
  return (
    <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-amber-800">Vorbehalt:</p>
            {!editing && (
              <button
                onClick={() => { setEditValue(reason); setEditing(true); }}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Bearbeiten
              </button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={3}
                className="w-full text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                placeholder="Vorbehalt / Begründung eingeben..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate({ thesisRequestId: requestId, reason: editValue })}
                  disabled={updateMutation.isPending || !editValue.trim()}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending ? "Speichern..." : "Speichern"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-700 whitespace-pre-wrap">{reason || <span className="italic text-amber-500">Kein Vorbehalt eingetragen.</span>}</p>
              {conditionalAt && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Erteilt am {new Date(conditionalAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}, {new Date(conditionalAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                </p>
              )}
              <button
                onClick={() => liftMutation?.mutate?.({ thesisRequestId: requestId })}
                disabled={liftMutation?.isPending}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {liftMutation?.isPending ? "Wird aufgehoben..." : "Vorbehalt aufheben – reguläre Zusage erteilen"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ req }: { req: { id: number; title: string; description: string; department: string; status: string; targetSemester?: string | null; language?: string | null; degreeType?: string | null; exposéUrl?: string | null; studentName?: string | null; studentEmail?: string | null; studentId?: number | null; programmeName?: string | null; programmeAbbreviation?: string | null; firstExaminerName?: string | null; firstExaminerEmail?: string | null; examinerId?: number | null; secondExaminerName?: string | null; secondExaminerEmail?: string | null; secondExaminerId?: number | null; wantedExaminerName?: string | null; wantedExaminerId?: number | null; wantedSecondExaminerName?: string | null; wantedSecondExaminerEmail?: string | null; wantedSecondExaminerId?: number | null; conditionalAcceptanceReason?: string | null; conditionalAcceptanceAt?: string | null; createdAt?: string | null } }) {
  const { t } = useLanguage();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showRegPreview, setShowRegPreview] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{ action: "accept" | "reject" | "fully_booked" | "requirements"; subject: string; body: string } | null>(null);
  const [requirementsDialog, setRequirementsDialog] = useState<{ subject: string; body: string } | null>(null);
  const [requirementsSubject, setRequirementsSubject] = useState("");
  const [requirementsBody, setRequirementsBody] = useState("");
  const [requirementsPreviewMode, setRequirementsPreviewMode] = useState(false);
  const [requirementsAttachments, setRequirementsAttachments] = useState<Array<{ filename: string; base64: string; mimeType: string; sizeKb: number }>>([]);
  const [requirementsSent, setRequirementsSent] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendEmailAfter, setSendEmailAfter] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const editCommentRef = useRef<HTMLTextAreaElement>(null);
  const [showSecondExaminerEmailDialog, setShowSecondExaminerEmailDialog] = useState(false);
  const [secondExaminerEmailSubject, setSecondExaminerEmailSubject] = useState("");
  const [secondExaminerEmailBody, setSecondExaminerEmailBody] = useState("");
  const [secondExaminerEmailSent, setSecondExaminerEmailSent] = useState(false);
  const [showSetSecondDialog, setShowSetSecondDialog] = useState(false);
  const [secondSearch, setSecondSearch] = useState("");
  const [selectedSecondId, setSelectedSecondId] = useState<number | null>(null);
  const [setSecondSent, setSetSecondSent] = useState(false);
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [conditionalReason, setConditionalReason] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const utils = trpc.useUtils();

  const { data: secondCandidates = [] } = (trpc.thesis as any).getAllSecondExaminerCandidates?.useQuery?.();

  const contactSecondMutation = (trpc.examinerEmailTemplates as any).contactSecondExaminer?.useMutation?.({
    onSuccess: () => {
      setSecondExaminerEmailSent(true);
      setTimeout(() => { setShowSecondExaminerEmailDialog(false); setSecondExaminerEmailSent(false); }, 2000);
    },
    onError: (err: any) => toast.error(err.message ?? "E-Mail konnte nicht gesendet werden."),
  });

  const setWantedSecondMutation = (trpc.examinerEmailTemplates as any).setWantedSecondExaminerByFirstExaminer?.useMutation?.({
    onSuccess: () => {
      setSetSecondSent(true);
      utils.thesis.examinerRequests.invalidate();
      setTimeout(() => { setShowSetSecondDialog(false); setSetSecondSent(false); setSelectedSecondId(null); setSecondSearch(""); }, 2000);
    },
    onError: (err: any) => toast.error(err.message ?? "Fehler beim Speichern."),
  });

  /** Fügt Markdown-Formatierung um den selektierten Text ein. */
  const insertFormat = useCallback((marker: string, setter: (v: string) => void, getValue: () => string, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = getValue();
    const selected = val.slice(start, end);
    const replacement = selected ? `${marker}${selected}${marker}` : `${marker}Text${marker}`;
    const next = val.slice(0, start) + replacement + val.slice(end);
    setter(next);
    setTimeout(() => {
      el.focus();
      const newCursor = selected ? start + replacement.length : start + marker.length;
      el.setSelectionRange(newCursor - (selected ? 0 : marker.length + 4), newCursor - (selected ? 0 : marker.length));
    }, 0);
  }, []);

  /** Fügt ein Aufzählungszeichen am Zeilenanfang ein. */
  const insertBullet = useCallback((setter: (v: string) => void, getValue: () => string, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const el = ref.current;
    if (!el) return;
    const val = getValue();
    const start = el.selectionStart;
    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    const next = val.slice(0, lineStart) + "- " + val.slice(lineStart);
    setter(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + 2, start + 2); }, 0);
  }, []);

  const { data: comments, isLoading: commentsLoading } = trpc.examinerComments.list.useQuery(
    { thesisRequestId: req.id },
    { enabled: showComments }
  );
  const createComment = trpc.examinerComments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      utils.examinerComments.list.invalidate({ thesisRequestId: req.id });
    },
    onError: (err) => toast.error(err.message),
  });
  const updateComment = trpc.examinerComments.update.useMutation({
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingContent("");
      utils.examinerComments.list.invalidate({ thesisRequestId: req.id });
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteComment = trpc.examinerComments.delete.useMutation({
    onSuccess: () => utils.examinerComments.list.invalidate({ thesisRequestId: req.id }),
    onError: (err) => toast.error(err.message),
  });

  const examinerRespond = trpc.thesis.examinerRespond.useMutation({
    onSuccess: (_, vars) => {
      if (vars.action === "conditional") {
        toast.success("Zusage unter Vorbehalt gespeichert.");
      } else {
        toast.success(vars.action === "accept" ? t.examiner.toastAccepted ?? "Anfrage angenommen!" : t.examiner.toastRejected ?? "Anfrage abgelehnt.");
      }
      utils.thesis.examinerRequests.invalidate();
      utils.examiner.getPendingRequests.invalidate();
      setShowRejectForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendResponseEmail = trpc.examinerEmailTemplates.sendResponse.useMutation({
    onError: (err) => toast.error("E-Mail konnte nicht gesendet werden: " + err.message),
  });

  const sendRequirementsMail = trpc.examinerEmailTemplates.sendRequirements.useMutation({
    onSuccess: (data) => {
      setRequirementsSent(true);
      // Dialog nach 2,5 Sekunden automatisch schließen
      setTimeout(() => {
        setRequirementsDialog(null);
        setRequirementsSent(false);
        setRequirementsAttachments([]);
      }, 2500);
    },
    onError: (err) => toast.error("E-Mail konnte nicht gesendet werden: " + err.message),
  });

  // Template für Aktion laden und Dialog öffnen
  const { data: examinerTemplates } = trpc.examinerEmailTemplates.getAll.useQuery();

  function openRequirementsDialog() {
    const tpl = examinerTemplates?.["requirements"];
    const vars = {
      name: req.studentName ?? "",
      thema: req.title ?? "",
      semester: req.targetSemester ?? "",
      studiengang: req.programmeAbbreviation ?? req.programmeName ?? req.department ?? "",
    };
    const resolve = (text: string) =>
      text
        .replace(/\{\{name\}\}/g, vars.name)
        .replace(/\{\{thema\}\}/g, vars.thema)
        .replace(/\{\{semester\}\}/g, vars.semester)
        .replace(/\{\{studiengang\}\}/g, vars.studiengang);
    const subject = tpl?.subject ? resolve(tpl.subject) : "";
    const body = tpl?.body ? resolve(tpl.body) : "";
    setRequirementsSubject(subject);
    setRequirementsBody(body);
    setRequirementsPreviewMode(false);
    setRequirementsAttachments([]);
    setRequirementsSent(false);
    setRequirementsDialog({ subject, body });
  }

  function openEmailDialog(action: "accept" | "reject" | "fully_booked") {
    const typeMap = { accept: "acceptance", reject: "rejection", fully_booked: "fully_booked" } as const;
    const tplType = typeMap[action];
    const tpl = examinerTemplates?.[tplType];
    const vars = {
      name: req.studentName ?? "",
      thema: req.title ?? "",
      semester: req.targetSemester ?? "",
      studiengang: req.department ?? "",
    };
    const resolve = (text: string) =>
      text
        .replace(/\{\{name\}\}/g, vars.name)
        .replace(/\{\{thema\}\}/g, vars.thema)
        .replace(/\{\{semester\}\}/g, vars.semester)
        .replace(/\{\{studiengang\}\}/g, vars.studiengang);
    const subject = tpl?.subject ? resolve(tpl.subject) : "";
    const body = tpl?.body ? resolve(tpl.body) : "";
    setEmailSubject(subject);
    setEmailBody(body);
    setEmailDialog({ action, subject, body });
  }

  async function handleConfirmAction() {
    if (!emailDialog) return;
    const action = emailDialog.action === "accept" ? "accept" : "reject";
    // Erst Status setzen
    examinerRespond.mutate(
      { id: req.id, action, rejectionReason: action === "reject" ? rejectionReason : undefined },
      {
        onSuccess: async () => {
          // Dann E-Mail senden (optional)
          if (sendEmailAfter && emailSubject && emailBody) {
            await sendResponseEmail.mutateAsync({
              thesisRequestId: req.id,
              subject: emailSubject,
              body: emailBody,
            });
            toast.success("Antwort-E-Mail wurde versendet.");
          }
          setEmailDialog(null);
        },
      }
    );
  }

  const { user } = useAuth();
  const isPending = req.status === "PENDING" || req.status === "PENDING_FIRST_EXAMINER";
  const isConditional = req.status === "CONDITIONAL_ACCEPTANCE";
  const isPendingSecond = req.status === "PENDING_SECOND_EXAMINER" && (req as any).wantedSecondExaminerId === user?.id;
  const isAcceptedSecond = req.status === "SECOND_EXAMINER_ACCEPTED" && (req as any).secondExaminerId === user?.id;
  // Ist der eingeloggte Nutzer der Zweitgutachter dieser Anfrage?
  const iAmSecondExaminer = user?.id !== undefined && (
    (req as any).secondExaminerId === user.id ||
    (req as any).wantedSecondExaminerId === user.id
  );

  const { data: condDocs } = (trpc.examinerEmailTemplates as any).getConditionalDocuments?.useQuery?.(
    { thesisRequestId: req.id },
    { enabled: isConditional }
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{req.title || "(Thema wird noch festgelegt)"}</h3>
          {req.studentName && (
            <p className="text-sm font-medium text-[#76B900] mt-0.5">{req.studentName}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {(req.programmeAbbreviation || req.programmeName || req.department) && (
              <span className="text-xs text-gray-500">
                <span className="font-medium text-gray-600">Studiengang:</span>{" "}
                {req.programmeAbbreviation ?? req.programmeName ?? req.department}
              </span>
            )}
            {req.targetSemester && (
              <span className="text-xs text-gray-500">
                <span className="font-medium text-gray-600">Zielsemester:</span>{" "}{req.targetSemester}
              </span>
            )}
            {req.createdAt && (
              <span className="text-xs text-gray-400">
                {new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          {/* Beteiligte Personen – Tabelle */}
          {(() => {
            const rows: PersonRow[] = [];
            if (req.studentName) rows.push({ role: "Studierende:r", name: req.studentName, contact: req.studentEmail ?? "", profileId: req.studentId ?? null, status: req.programmeAbbreviation ?? req.programmeName ?? req.department ?? "" });
            if (req.examinerId) rows.push({ role: "Erstgutachter:in", name: req.firstExaminerName ?? "–", contact: req.firstExaminerEmail ?? "", profileId: req.examinerId, status: "zugewiesen" });
            else if (req.wantedExaminerName) rows.push({ role: "Erstgutachter:in", name: req.wantedExaminerName, contact: "", status: "angefragt" });
            if (req.secondExaminerId) rows.push({ role: "Zweitgutachter:in", name: req.secondExaminerName ?? "–", contact: req.secondExaminerEmail ?? "", profileId: req.secondExaminerId, status: "zugewiesen" });
            else if (req.wantedSecondExaminerName) rows.push({ role: "Zweitgutachter:in", name: req.wantedSecondExaminerName, contact: req.wantedSecondExaminerEmail ?? "", status: "angefragt" });
            if (rows.length === 0) return null;
            return <div className="mt-3"><InvolvedPersonsTable rows={rows} compact /></div>;
          })()}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={req.status} />
          {isConditional && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm animate-pulse">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              Unter Vorbehalt
            </span>
          )}
        </div>
      </div>
      {/* Beschreibung – aufklappbar */}
      <div className="mb-3">
        <p className={`text-sm text-gray-600 ${showDetails ? "" : "line-clamp-2"}`}>{req.description}</p>
        {req.description && req.description.length > 120 && (
          <button
            onClick={() => setShowDetails(v => !v)}
            className="mt-1 flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: "#76B900" }}
          >
            {showDetails ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                Weniger anzeigen
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                Vollständige Beschreibung anzeigen
              </>
            )}
          </button>
        )}
        {/* Zusatzfelder nur im aufgeklappten Zustand */}
        {showDetails && (
          <div className="mt-3 space-y-3">
            {(req as any).abstract && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Abstract</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{(req as any).abstract}</p>
              </div>
            )}
            {(req as any).rejectionReason && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Ablehnungsgrund</p>
                <p className="text-sm text-red-700">{(req as any).rejectionReason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {req.studentEmail && (
                <div><span className="font-medium text-gray-500">E-Mail Studierende:r:</span>{" "}<span className="text-gray-700">{req.studentEmail}</span></div>
              )}
              {req.degreeType && (
                <div><span className="font-medium text-gray-500">Abschlussart:</span>{" "}<span className="text-gray-700">{req.degreeType === "bachelor" ? "Bachelor" : "Master"}</span></div>
              )}
              {req.language && (
                <div><span className="font-medium text-gray-500">Sprache:</span>{" "}<span className="text-gray-700">{req.language === "de" ? "Deutsch" : "Englisch"}</span></div>
              )}
              {req.targetSemester && (
                <div><span className="font-medium text-gray-500">Zielsemester:</span>{" "}<span className="text-gray-700">{req.targetSemester}</span></div>
              )}
            </div>

            {/* ── Private Notizen (inline im aufgeklappten Bereich) ── */}
            <div className="border-t border-gray-100 pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Meine Notizen
                <span className="ml-1 text-xs font-normal text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">nur für Sie sichtbar</span>
              </p>
              {commentsLoading ? (
                <div className="text-xs text-gray-400 py-1">Wird geladen…</div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-2 mb-2">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      {editingCommentId === c.id ? (
                        <div className="space-y-1.5">
                          <FormatToolbar
                            onBold={() => insertFormat("**", setEditingContent, () => editingContent, editCommentRef)}
                            onItalic={() => insertFormat("_", setEditingContent, () => editingContent, editCommentRef)}
                            onBullet={() => insertBullet(setEditingContent, () => editingContent, editCommentRef)}
                          />
                          <textarea
                            ref={editCommentRef}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-b-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#76B900]/40 font-mono"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateComment.mutate({ id: c.id, content: editingContent })}
                              disabled={updateComment.isPending || !editingContent.trim()}
                              className="px-3 py-1 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                              style={{ backgroundColor: "#76B900" }}
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => { setEditingCommentId(null); setEditingContent(""); }}
                              className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <MarkdownNote content={c.content} />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(c.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {c.updatedAt !== c.createdAt && " (bearbeitet)"}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setEditingCommentId(c.id); setEditingContent(c.content); }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => deleteComment.mutate({ id: c.id })}
                                disabled={deleteComment.isPending}
                                className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mb-2">Noch keine Notizen vorhanden.</p>
              )}
              {/* Neue Notiz */}
              <div className="space-y-1.5">
                <FormatToolbar
                  onBold={() => insertFormat("**", setNewComment, () => newComment, newCommentRef)}
                  onItalic={() => insertFormat("_", setNewComment, () => newComment, newCommentRef)}
                  onBullet={() => insertBullet(setNewComment, () => newComment, newCommentRef)}
                />
                <textarea
                  ref={newCommentRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Neue Notiz hinzufügen…"
                  rows={3}
                  className="w-full text-sm border border-amber-200 rounded-b-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300/60 bg-amber-50/50"
                />
                <button
                  onClick={() => createComment.mutate({ thesisRequestId: req.id, content: newComment })}
                  disabled={createComment.isPending || !newComment.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#76B900" }}
                >
                  {createComment.isPending ? "Wird gespeichert…" : "Notiz speichern"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Persönliche Angaben der Studierenden – strukturierter Block */}
      {((req as any).studySpecializations || (req as any).personalInterests || (req as any).keywords) && (
        <div className="mb-4 rounded-xl border border-[#76B900]/20 bg-[#76B900]/5 p-3.5 space-y-3">
          <p className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">Persönliche Angaben</p>

          {(req as any).studySpecializations && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Gewählte Vertiefungen im Studium</p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{(req as any).studySpecializations}</p>
            </div>
          )}

          {(req as any).personalInterests && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Besondere Interessen</p>
              <p className="text-xs text-gray-800 whitespace-pre-wrap">{(req as any).personalInterests}</p>
            </div>
          )}

          {(req as any).keywords && (() => {
            const rawKeywords = (req as any).keywords;
            const tags: string[] = (() => {
              try { return JSON.parse(rawKeywords); } catch {
                return rawKeywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
              }
            })();
            if (tags.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Schlagwörter</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#F1F8E9", color: "#4a7a00", border: "1px solid #c8e6a0" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {req.exposéUrl && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "#F1F8E9", color: "#76B900" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Exposé anzeigen
          </button>
          <a
            href={req.exposéUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Herunterladen
          </a>
        </div>
      )}
      {showPdfPreview && req.exposéUrl && (
        <PdfPreviewModal url={req.exposéUrl} onClose={() => setShowPdfPreview(false)} />
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
        {req.targetSemester && <span>📅 {req.targetSemester}</span>}
        {req.language && <span>🌐 {req.language === "de" ? (t.dean?.language_de ?? "Deutsch") : (t.dean?.language_en ?? "Englisch")}</span>}
        {req.degreeType && <span>🎓 {req.degreeType === "bachelor" ? (t.pav?.bachelor ?? "Bachelor") : (t.pav?.master ?? "Master")}</span>}
      </div>

      {/* Status-Label: Zweitgutachter vorhanden, angefragt oder fehlend */}
      {(["FIRST_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET", "SECOND_EXAMINER_ACCEPTED", "PENDING_SECOND_EXAMINER", "MATCHED", "REGISTERED", "ACCEPTED", "COMPLETED"] as string[]).includes(req.status) && (
        <div className="mb-3 space-y-2">
          {/* Zweitgutachter bereits zugesagt/zugewiesen */}
          {req.secondExaminerName && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Zweitgutachter:in: {req.secondExaminerName} – <strong>Zugesagt</strong>
              </span>
              {req.secondExaminerEmail && (
                <button
                  onClick={() => {
                    const recipientName = req.secondExaminerName ?? "Zweitgutachter:in";
                    setSecondExaminerEmailSubject(`Re: Zweitbetreuung – ${req.title}`);
                    setSecondExaminerEmailBody(`Sehr geehrte/r ${recipientName},\n\n`);
                    setShowSecondExaminerEmailDialog(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  E-Mail senden
                </button>
              )}
            </div>
          )}
          {/* Zweitgutachter abgelehnt */}
          {!req.secondExaminerName && !req.wantedSecondExaminerName && (req as any).secondExaminerRejectedAt && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 animate-pulse">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Zweitgutachter:in hat <strong>abgelehnt</strong> – bitte neue Person anfragen
              </span>
            </div>
          )}
          {/* Zweitgutachter angefragt (noch keine Zusage) */}
          {!req.secondExaminerName && req.wantedSecondExaminerName && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Zweitgutachter:in: {req.wantedSecondExaminerName} – <strong>Angefragt</strong>
              </span>
              {req.wantedSecondExaminerEmail && (
                <button
                  onClick={() => {
                    const recipientName = req.wantedSecondExaminerName ?? "Zweitgutachter:in";
                    setSecondExaminerEmailSubject(`Bitte um Zusage als Zweitgutachter:in – ${req.title}`);
                    setSecondExaminerEmailBody(
                      `Sehr geehrte/r ${recipientName},\n\n` +
                      `ich bin als Erstgutachter:in für die Abschlussarbeit „${req.title}\u201c von ${req.studentName ?? "dem/der Studierenden"} eingetragen.\n\n` +
                      `Sie wurden als Zweitgutachter:in angefragt und Ihre Zusage steht noch aus. Ich würde mich freuen, wenn Sie die Anfrage bestätigen könnten.\n\n` +
                      `Bitte melden Sie sich im System unter: ${window.location.origin}/examiner\n\n` +
                      `Mit freundlichen Grüßen`
                    );
                    setShowSecondExaminerEmailDialog(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Zur Zusage auffordern
                </button>
              )}
            </div>
          )}
          {/* Kein Zweitgutachter vorhanden oder angefragt */}
          {!req.secondExaminerName && !req.wantedSecondExaminerName && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Zweitgutachter:in fehlt noch
              </span>
              {req.status === "FIRST_EXAMINER_ACCEPTED" && (
                <button
                  onClick={() => { setSecondSearch(""); setSelectedSecondId(null); setShowSetSecondDialog(true); }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Zweitgutachter:in eintragen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialog: Neuen Zweitgutachter eintragen */}
      {showSetSecondDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Zweitgutachter:in eintragen</h3>
              <button onClick={() => setShowSetSecondDialog(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Wählen Sie eine Person als neuen Zweitgutachter-Wunsch für <strong>{req.title}</strong>. Die Person erhält anschließend eine Anfrage.</p>
            <input
              type="text"
              placeholder="Name suchen..."
              value={secondSearch}
              onChange={(e) => setSecondSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900]"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {(secondCandidates as any[])
                .filter((c: any) => !secondSearch || c.name?.toLowerCase().includes(secondSearch.toLowerCase()) || c.email?.toLowerCase().includes(secondSearch.toLowerCase()))
                .map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedSecondId(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      selectedSecondId === c.id
                        ? "bg-[#76b900] text-white"
                        : "hover:bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.email && <span className="ml-2 text-xs opacity-70">{c.email}</span>}
                  </button>
                ))}
              {(secondCandidates as any[]).filter((c: any) => !secondSearch || c.name?.toLowerCase().includes(secondSearch.toLowerCase()) || c.email?.toLowerCase().includes(secondSearch.toLowerCase())).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Keine Treffer</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSetSecondDialog(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Abbrechen</button>
              <button
                disabled={!selectedSecondId || setWantedSecondMutation?.isPending}
                onClick={() => setWantedSecondMutation?.mutate?.({ thesisRequestId: req.id, secondExaminerId: selectedSecondId! })}
                className="px-4 py-2 rounded-xl bg-[#76b900] text-white text-sm font-medium hover:bg-[#5a8f00] disabled:opacity-50 transition-colors"
              >
                {setSecondSent ? "✅ Gespeichert" : setWantedSecondMutation?.isPending ? "Speichere..." : "Eintragen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Mail-Dialog: Gutachter:innen kontaktieren */}
      {showSecondExaminerEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {iAmSecondExaminer ? "E-Mail an Erstgutachter:in" : "E-Mail an Zweitgutachter:in"}
              </h3>
              <button onClick={() => setShowSecondExaminerEmailDialog(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Empfänger:in:{" "}
              {iAmSecondExaminer ? (
                <><strong>{req.firstExaminerName ?? "Erstgutachter:in"}</strong> ({req.firstExaminerEmail ?? "–"})</>
              ) : (
                <><strong>{req.secondExaminerName ?? req.wantedSecondExaminerName}</strong> ({req.secondExaminerEmail ?? req.wantedSecondExaminerEmail})</>
              )}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Betreff</label>
                <input
                  type="text"
                  value={secondExaminerEmailSubject}
                  onChange={(e) => setSecondExaminerEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nachricht</label>
                <textarea
                  rows={8}
                  value={secondExaminerEmailBody}
                  onChange={(e) => setSecondExaminerEmailBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSecondExaminerEmailDialog(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Abbrechen</button>
              <button
                disabled={!secondExaminerEmailSubject || !secondExaminerEmailBody || contactSecondMutation?.isPending}
                onClick={() => contactSecondMutation?.mutate?.({
                  thesisRequestId: req.id,
                  subject: secondExaminerEmailSubject,
                  body: secondExaminerEmailBody,
                  recipientEmail: iAmSecondExaminer
                    ? (req.firstExaminerEmail as string)
                    : ((req.secondExaminerEmail ?? req.wantedSecondExaminerEmail) as string),
                })}
                className="px-4 py-2 rounded-xl bg-[#76b900] text-white text-sm font-medium hover:bg-[#5a8f00] disabled:opacity-50 transition-colors"
              >
                {secondExaminerEmailSent ? "✅ Gesendet" : contactSecondMutation?.isPending ? "Sende..." : "E-Mail senden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anmeldedokument – Vorschau + Download */}
      {(["FIRST_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "MATCHED", "REGISTERED", "ACCEPTED", "COMPLETED"] as string[]).includes(req.status) && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRegPreview(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[#76B900] text-white hover:bg-[#5a8f00] transition-colors"
            title="Anmeldedokument im Browser ansehen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Anmeldedokument ansehen
          </button>
        </div>
      )}
      {showRegPreview && (
        <RegistrationPdfPreviewModal thesisId={req.id} onClose={() => setShowRegPreview(false)} />
      )}

      {/* ── Zweitgutachter-Anfrage: Annehmen/Ablehnen ── */}
      {isAcceptedSecond && (
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sie haben die Zweitbetreuung bestätigt
          </p>
          <p className="text-xs text-green-700 mb-3">Sie sind als Zweitgutachter:in für diese Abschlussarbeit eingetragen.</p>
          {req.studentName && (
            <div className="bg-white rounded-lg border border-green-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Kontakt der/des Studierenden</p>
              <p className="text-sm font-medium text-gray-900">{req.studentName}</p>
              {req.studentEmail && (
                <a href={`mailto:${req.studentEmail}`} className="text-xs text-[#006937] hover:underline flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {req.studentEmail}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {isPendingSecond && (
        <SecondExaminerRequestBox
          req={req}
          openEmailDialog={openEmailDialog}
          isPending={examinerRespond.isPending}
        />
      )}

      {(isPending || isConditional) && (
        <div className="space-y-3">
          {/* Vorbehalt-Hinweis wenn Status CONDITIONAL_ACCEPTANCE */}
          {isConditional && (
            <ConditionalReasonBox
              requestId={req.id}
              reason={(req as any).conditionalAcceptanceReason ?? ""}
              conditionalAt={(req as any).conditionalAcceptanceAt ?? null}
              onUpdated={() => utils.thesis.examinerRequests.invalidate()}
            />
          )}
          {/* Eingereichte Dokumente der Studierenden */}
          {isConditional && condDocs && condDocs.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Eingereichte Dokumente ({condDocs.length})
              </p>
              <div className="space-y-1.5">
                {condDocs.map((doc: any) => (
                  <div key={doc.id} className="rounded-lg border border-blue-200 bg-white overflow-hidden">
                    <div className="flex items-center gap-2 p-2">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-700 hover:underline truncate block">
                          {doc.originalFilename}
                        </a>
                        {doc.note && <p className="text-xs text-blue-600 truncate">{doc.note}</p>}
                        <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString("de-DE")}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {doc.fileSizeBytes ? `${Math.round(doc.fileSizeBytes / 1024)} KB` : ""}
                      </span>
                    </div>
                    {/* Kommentarbereich für dieses Dokument */}
                    <div className="px-3 pb-3 border-t border-blue-100 bg-blue-50/40">
                      <p className="text-xs font-semibold text-blue-700 mt-2 mb-1">Feedback</p>
                      <DocComments
                        documentId={doc.id}
                        documentName={doc.originalFilename}
                        currentUserId={user?.id ?? 0}
                        canComment={true}
                        showInput={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => openEmailDialog("accept")}
              disabled={examinerRespond.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#76B900" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isConditional ? "Endgültig zusagen" : "Annehmen"}
            </button>
            <button
              onClick={() => openEmailDialog("reject")}
              disabled={examinerRespond.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Ablehnen
            </button>
          </div>
          {/* Zusage unter Vorbehalt – nur bei PENDING_FIRST_EXAMINER */}
          {isPending && (
            <button
              onClick={() => { setConditionalReason((req as any).conditionalAcceptanceReason ?? ""); setShowConditionalDialog(true); }}
              disabled={examinerRespond.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Zusage unter Vorbehalt
            </button>
          )}
          <button
            onClick={openRequirementsDialog}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Sende Mail mit persönlichen Hinweisen
          </button>
        </div>
      )}

      {/* Dialog: Zusage unter Vorbehalt */}
      {showConditionalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConditionalDialog(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-gray-900">Zusage unter Vorbehalt</span>
              </div>
              <button onClick={() => setShowConditionalDialog(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">Sie signalisieren grundsätzliche Betreuungsbereitschaft, haben das Thema aber noch nicht final akzeptiert. Bitte geben Sie Ihren Vorbehalt an.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vorbehalt / Begründung <span className="text-red-500">*</span></label>
                <textarea
                  rows={10}
                  value={conditionalReason}
                  onChange={(e) => setConditionalReason(e.target.value)}
                  placeholder="z.B. Thema muss noch konkretisiert werden, Expose ausstehend, Rücksprache mit Fachbereich nötig ..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y min-h-[200px]"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowConditionalDialog(false)} className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                disabled={!conditionalReason.trim() || examinerRespond.isPending}
                onClick={() => {
                  examinerRespond.mutate(
                    { id: req.id, action: "conditional", conditionalReason: conditionalReason.trim() },
                    {
                      onSuccess: () => {
                        // Den gesendeten Text optimistisch ins req-Objekt übernehmen
                        (req as any).conditionalAcceptanceReason = conditionalReason.trim();
                        toast.success("Zusage unter Vorbehalt gespeichert.");
                        setShowConditionalDialog(false);
                      },
                    }
                  );
                }}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {examinerRespond.isPending ? "Wird gespeichert..." : "Unter Vorbehalt zusagen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Persönliche Hinweise senden */}
      {requirementsDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setRequirementsDialog(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col"
            style={{ maxHeight: "92vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#76B900" }} />
                <span className="font-semibold text-gray-900">Persönliche Hinweise/Anforderungen senden</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Vorschau-Toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    onClick={() => setRequirementsPreviewMode(false)}
                    className={`px-3 py-1.5 transition-colors ${
                      !requirementsPreviewMode
                        ? 'text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                    style={!requirementsPreviewMode ? { backgroundColor: "#76B900" } : undefined}
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => setRequirementsPreviewMode(true)}
                    className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                      requirementsPreviewMode
                        ? 'text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                    style={requirementsPreviewMode ? { backgroundColor: "#76B900" } : undefined}
                  >
                    Vorschau
                  </button>
                </div>
                <button onClick={() => setRequirementsDialog(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Empfänger */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                <span className="font-medium">An:</span> {req.studentName ?? "Studierende:r"}
                {req.studentEmail && <span className="ml-1 text-gray-400">&lt;{req.studentEmail}&gt;</span>}
              </div>

              {/* ── Erfolgsmeldung nach Versand ── */}
              {requirementsSent ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900">E-Mail erfolgreich gesendet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Persönliche Hinweise wurden an <strong>{req.studentName ?? "die/den Studierende:n"}</strong> gesendet.
                      {requirementsAttachments.length > 0 && (
                        <span> ({requirementsAttachments.length} {requirementsAttachments.length === 1 ? "Anhang" : "Anhänge"} mitgesendet)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Dieser Dialog schließt sich automatisch…</p>
                  </div>
                </div>
              ) : !requirementsPreviewMode ? (
                /* ── Bearbeitungs-Modus ── */
                <>
                  <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    Die Vorlage stammt aus Ihrem Profil unter „Persönliche Hinweise/Anforderungen Erstgutachter:in“. Sie können den Text hier noch anpassen.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Betreff</label>
                    <input
                      type="text"
                      value={requirementsSubject}
                      onChange={(e) => setRequirementsSubject(e.target.value)}
                      placeholder="Betreff der E-Mail..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">E-Mail-Text</label>
                    <textarea
                      rows={10}
                      value={requirementsBody}
                      onChange={(e) => setRequirementsBody(e.target.value)}
                      placeholder="Ihr persönlicher Hinweistext..."
                      style={{ maxHeight: "16rem", overflowY: "auto" }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
                    />
                    {!requirementsSubject && !requirementsBody && (
                      <p className="text-xs text-amber-600 mt-1">
                        Kein Template hinterlegt. Bitte legen Sie zuerst ein Template im Profil unter „Persönliche Hinweise/Anforderungen Erstgutachter:in“ an.
                      </p>
                    )}
                  </div>
                  {/* ── Dateianhang-Upload ── */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Anhänge (max. 5 Dateien, 10 MB gesamt)</label>
                    <label
                      className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="text-xs">Dateien hier ablegen oder klicken zum Auswählen</span>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (requirementsAttachments.length + files.length > 5) {
                            toast.error("Maximal 5 Anhänge erlaubt.");
                            return;
                          }
                          files.forEach((file) => {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error(`"${file.name}" ist zu groß (max. 5 MB pro Datei).`);
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = (ev.target?.result as string).split(",")[1];
                              setRequirementsAttachments((prev) => [
                                ...prev,
                                { filename: file.name, base64, mimeType: file.type || "application/octet-stream", sizeKb: Math.round(file.size / 1024) },
                              ]);
                            };
                            reader.readAsDataURL(file);
                          });
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {requirementsAttachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {requirementsAttachments.map((a, i) => (
                          <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="text-gray-700 truncate max-w-[220px]">{a.filename}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-400">{a.sizeKb} KB</span>
                              <button
                                onClick={() => setRequirementsAttachments((prev) => prev.filter((_, j) => j !== i))}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                /* ── Vorschau-Modus ── */
                <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-white">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Betreff</p>
                    <p className="text-sm font-medium text-gray-900">
                      {requirementsSubject || <span className="text-gray-400 italic">Kein Betreff</span>}
                    </p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">E-Mail-Text</p>
                    {requirementsBody ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {requirementsBody}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Kein Text eingegeben.</p>
                    )}
                  </div>
                  {requirementsAttachments.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 bg-white">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Anhänge</p>
                      <div className="flex flex-wrap gap-1">
                        {requirementsAttachments.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 rounded-lg px-2 py-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            {a.filename} ({a.sizeKb} KB)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                    <p className="text-xs text-amber-700">
                      Dies ist eine Vorschau der E-Mail, die an <strong>{req.studentName ?? "die/den Studierende:n"}</strong> gesendet wird.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setRequirementsDialog(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              {requirementsPreviewMode ? (
                <button
                  onClick={() => setRequirementsPreviewMode(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  Zurück zum Bearbeiten
                </button>
              ) : (
                <button
                  onClick={() => setRequirementsPreviewMode(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  Vorschau
                </button>
              )}
              <button
                onClick={() => {
                  if (!requirementsSubject || !requirementsBody) {
                    toast.error("Bitte füllen Sie Betreff und Text aus.");
                    return;
                  }
                  sendRequirementsMail.mutate({
                    thesisRequestId: req.id,
                    subject: requirementsSubject,
                    body: requirementsBody,
                    attachments: requirementsAttachments.map(({ filename, base64, mimeType }) => ({ filename, base64, mimeType })),
                  });
                }}
                disabled={sendRequirementsMail.isPending}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#76B900" }}
              >
                {sendRequirementsMail.isPending ? "Wird gesendet..." : "Hinweise senden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Mail-Vorschau-Dialog */}
      {emailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEmailDialog(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${emailDialog.action === "accept" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-semibold text-gray-900">
                  {emailDialog.action === "accept" ? "Anfrage annehmen" : "Anfrage ablehnen"}
                </span>
              </div>
              <button onClick={() => setEmailDialog(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Empfänger */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                <span className="font-medium">An:</span> {req.studentName ?? "Studierende:r"}
                {req.studentEmail && <span className="ml-1 text-gray-400">&lt;{req.studentEmail}&gt;</span>}
              </div>

              {/* Ablehnungsgrund (nur bei Ablehnen) */}
              {emailDialog.action === "reject" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ablehnungsgrund (optional)</label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Kurze Begründung für die Ablehnung..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                </div>
              )}

              {/* E-Mail-Betreff */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Betreff</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Betreff der E-Mail..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                />
              </div>

              {/* E-Mail-Text */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-Mail-Text</label>
                <textarea
                  rows={10}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Ihr persönlicher Text an die/den Studierenden..."
                  style={{ maxHeight: "16rem", overflowY: "auto" }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none font-mono"
                />
                {!emailSubject && !emailBody && (
                  <p className="text-xs text-amber-600 mt-1">
                    Kein Template hinterlegt. Sie können den Text manuell eingeben oder zuerst ein Template im Profil anlegen.
                  </p>
                )}
              </div>

              {/* E-Mail senden Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailAfter}
                  onChange={(e) => setSendEmailAfter(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-600"
                />
                <span className="text-sm text-gray-700">Antwort-E-Mail an Studierende:n senden</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setEmailDialog(null)}
                className="flex-1 px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={examinerRespond.isPending || sendResponseEmail.isPending}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${
                  emailDialog.action === "accept"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {examinerRespond.isPending || sendResponseEmail.isPending
                  ? "Wird verarbeitet..."
                  : emailDialog.action === "accept"
                  ? "Annehmen & senden"
                  : "Ablehnen & senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Requests View ────────────────────────────────────────────────────────────
type RequestSortKey = "name" | "programme" | "semester" | "title" | "date" | "status";
const STATUS_SORT_ORDER: Record<string, number> = {
  CONDITIONAL_ACCEPTANCE: 0,
  PENDING_FIRST_EXAMINER: 1,
  PENDING: 2,
  FIRST_EXAMINER_ACCEPTED: 3,
  SECOND_EXAMINER_ASSIGNED: 4,
  MATCHED: 5,
  ACCEPTED: 6,
  REJECTED: 7,
  FIRST_EXAMINER_REJECTED: 8,
  WITHDRAWN: 9,
};
function sortRequests<T extends { studentName?: string | null; programmeName?: string | null; programmeAbbreviation?: string | null; department?: string; targetSemester?: string | null; title?: string; createdAt?: string; status?: string }>(list: T[], key: RequestSortKey): T[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case "name": return (a.studentName ?? "").localeCompare(b.studentName ?? "", "de");
      case "programme": return (a.programmeAbbreviation ?? a.programmeName ?? a.department ?? "").localeCompare(b.programmeAbbreviation ?? b.programmeName ?? b.department ?? "", "de");
      case "semester": return (a.targetSemester ?? "").localeCompare(b.targetSemester ?? "", "de");
      case "title": return (a.title ?? "").localeCompare(b.title ?? "", "de");
      case "date": return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      case "status": return (STATUS_SORT_ORDER[a.status ?? ""] ?? 99) - (STATUS_SORT_ORDER[b.status ?? ""] ?? 99);
      default: return 0;
    }
  });
}

function RequestsView() {
  const [sortKey, setSortKey] = useState<RequestSortKey>("date");
  const [filterMissingSecond, setFilterMissingSecond] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const { data: assignedRequests, isLoading: loadingAssigned } = trpc.thesis.examinerRequests.useQuery();
  const { data: pendingRequests, isLoading: loadingPending } = trpc.examiner.getPendingRequests.useQuery();
  const { data: myProfile } = trpc.examiner.myProfile.useQuery();
  const isSecondExaminer = (myProfile as any)?.isSecondExaminer === 1;
  const isLoading = loadingAssigned || loadingPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

    // Ausstehende Freigaben (PENDING_FIRST_EXAMINER) – noch nicht in assignedRequests enthalten
  const assignedIds = new Set(((assignedRequests ?? []) as any[]).map((r: any) => r.id));
  const newPending = ((pendingRequests ?? []) as any[]).filter((r: any) => !assignedIds.has(r.id));
  // Alle Anfragen zusammenführen: assignedRequests hat Vorrang (aktuellerer Status)
  // newPending ergänzt nur Anfragen, die noch nicht in assignedRequests sind
  const allRequests = [
    ...(assignedRequests ?? []),
    ...newPending
      .filter((r: any) => !assignedIds.has(r.id))
      .map((r) => ({ ...r, exposeUrl: (r as any).exposeUrl ?? null, degreeType: (r as any).degreeType ?? null, language: (r as any).language ?? null })),
  ];
  // Alle verfügbaren Semester extrahieren
  const allSemesters = sortSemesters(
    Array.from(new Set((allRequests as any[]).map((r: any) => r.targetSemester).filter(Boolean)))
  ) as string[];
  // Semester-gefilterte Anfragen
  const semesterFiltered = semesterFilter === "all"
    ? allRequests
    : allRequests.filter((r: any) => r.targetSemester === semesterFilter);
  if (!allRequests.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-semibold mb-1">Keine offenen Anfragen</h3>
        <p className="text-gray-500 text-sm">Sobald Studierende eine Anfrage stellen, erscheint sie hier.</p>
        {/* Zweitgutachter-Hinweis */}
        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${
          isSecondExaminer
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-gray-50 border-gray-200 text-gray-500"
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isSecondExaminer ? "bg-green-500" : "bg-gray-300"
          }`} />
          {isSecondExaminer
            ? "Sie sind als Zweitgutachter:in eingetragen – Anfragen erscheinen hier, sobald Studierende Sie anfragen."
            : "Sie sind aktuell nicht als Zweitgutachter:in eingetragen."}
        </div>
      </div>
    );
  }

  // Filter: nur Anfragen ohne Zweitgutachter + Semester
  const filteredRequests = filterMissingSecond
    ? semesterFiltered.filter((r: any) => !r.secondExaminerName || r.secondExaminerName.trim() === "")
    : semesterFiltered;
  const awaitingApproval = sortRequests(filteredRequests.filter((r) => r.status === "PENDING_FIRST_EXAMINER"), sortKey);
  const conditionalList = sortRequests(filteredRequests.filter((r) => r.status === "CONDITIONAL_ACCEPTANCE"), sortKey);
  const pending = sortRequests(filteredRequests.filter((r) => r.status === "PENDING"), sortKey);
  // Zweitgutachter-Anfragen: PENDING_SECOND_EXAMINER wo der aktuelle Nutzer wantedSecondExaminer ist
  const pendingSecond = sortRequests(filteredRequests.filter((r: any) => r.status === "PENDING_SECOND_EXAMINER" && r.requestRole === "second"), sortKey);
  const others = sortRequests(filteredRequests.filter((r: any) => r.status !== "PENDING" && r.status !== "PENDING_FIRST_EXAMINER" && r.status !== "CONDITIONAL_ACCEPTANCE" && !(r.status === "PENDING_SECOND_EXAMINER" && r.requestRole === "second")), sortKey);

  const sortOptions: { value: RequestSortKey; label: string }[] = [
    { value: "date", label: "Neueste zuerst" },
    { value: "status", label: "Status" },
    { value: "name", label: "Name A–Z" },
    { value: "programme", label: "Studiengang A–Z" },
    { value: "semester", label: "Semester" },
    { value: "title", label: "Thema A–Z" },
  ];

  return (
    <div className="space-y-6">
      {/* Semesterfilter + Sortier-Leiste */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Semesterfilter */}
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium bg-white text-gray-600 focus:outline-none"
        >
          <option value="all">Alle Semester</option>
          {allSemesters.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-gray-300">|</span>
        {/* Filter: Zweitgutachter fehlt */}
        <button
          onClick={() => setFilterMissingSecond((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterMissingSecond
              ? "bg-amber-100 text-amber-700 border-amber-300"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {filterMissingSecond ? "Zweitgutachter fehlt ✓" : "Zweitgutachter fehlt"}
        </button>
        <span className="text-xs text-gray-300">|</span>
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

      {awaitingApproval.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Zur Freigabe ausstehend ({awaitingApproval.length})
          </h3>
          <div className="space-y-4">
            {awaitingApproval.map((req) => <RequestCard key={req.id} req={req} />)}
          </div>
        </div>
      )}
      {pendingSecond.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Anfragen als Zweitgutachter:in ({pendingSecond.length})
          </h3>
          <div className="space-y-4">
            {pendingSecond.map((req) => <RequestCard key={req.id} req={req} />)}
          </div>
        </div>
      )}
      {conditionalList.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Zusage unter Vorbehalt ({conditionalList.length})
          </h3>
          <div className="space-y-4">
            {conditionalList.map((req) => <RequestCard key={req.id} req={req} />)}
          </div>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Offene Anfragen ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map((req) => <RequestCard key={req.id} req={req} />)}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Bearbeitete Anfragen</h3>
          <div className="space-y-4">
            {others.map((req) => <RequestCard key={req.id} req={req} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Semester-Sortierfunktion ────────────────────────────────────────────────
/**
 * Sortiert Semester-Strings chronologisch: WS kommt nach SoSe desselben Jahres.
 * Format: "SoSe2026" (April–Sept) < "WS2026" (Okt–März) < "SoSe2027" < "WS2027" ...
 */
function semesterSortKey(s: string): number {
  if (s.startsWith("WS")) {
    const y = parseInt(s.slice(2));
    return y * 10 + 1; // WS2026 → 20261
  }
  if (s.startsWith("SoSe")) {
    const y = parseInt(s.slice(4));
    return y * 10 + 0; // SoSe2026 → 20260
  }
  return 0;
}
function sortSemesters(sems: string[]): string[] {
  return [...sems].sort((a, b) => semesterSortKey(a) - semesterSortKey(b));
}

// ─── Profile Edit ─────────────────────────────────────────────────────────────
/** Aktuelle und nächste 3 Semester generieren */
function generateUpcomingSemesters(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const isWinter = month >= 10 || month <= 3;
  const semesters: string[] = [];
  let y = year;
  let ws = isWinter;
  for (let i = 0; i < 8; i++) {
    semesters.push(ws ? `WS${y}` : `SoSe${y}`);
    if (ws) { y++; ws = false; } else { ws = true; }
  }
  return semesters;
}

function semesterLabel(s: string): string {
  if (s.startsWith("WS")) {
    const y = parseInt(s.slice(2));
    return `WS ${y}/${y + 1}`;
  }
  if (s.startsWith("SoSe")) return `SoSe ${s.slice(4)}`;
  return s;
}

type SemesterCapacity = { semester: string; maxFirst: number; maxSecond: number };

function ProfileEdit() {
  const { t } = useLanguage();
    const { data: profile, isLoading } = trpc.examiner.myProfile.useQuery();
  const { data: savedCapacities = [], isLoading: capsLoading } = trpc.examiner.getSemesterCapacities.useQuery();
  const { data: usageData = [] } = trpc.examiner.getCapacityUsage.useQuery();
  const utils = trpc.useUtils();
  const upsertCapacity = trpc.examiner.upsertSemesterCapacity.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const upcomingSemesters = generateUpcomingSemesters();
  const [capacities, setCapacities] = useState<SemesterCapacity[]>([]);
  // hasHydrated: verhindert, dass der useEffect nach dem Speichern den lokalen State überschreibt
  const hasHydrated = useRef(false);
  // Beim ersten Laden die gespeicherten Werte in den lokalen State übernehmen (nur einmalig)
  useEffect(() => {
    if (capsLoading) return;
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const merged = upcomingSemesters.map((sem) => {
      const saved = (savedCapacities as SemesterCapacity[]).find((c) => c.semester === sem);
      return { semester: sem, maxFirst: saved?.maxFirst ?? 0, maxSecond: saved?.maxSecond ?? 0 };
    });
    setCapacities(merged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCapacities, capsLoading]);
  const handleSaveCapacities = async () => {
    try {
      // Erst alle Mutations abschließen, dann den Cache aktualisieren
      for (const cap of capacities) {
        await upsertCapacity.mutateAsync({ semester: cap.semester, maxFirst: cap.maxFirst, maxSecond: cap.maxSecond });
      }
      // Optimistisch den Cache mit den gespeicherten Werten setzen
      utils.examiner.getSemesterCapacities.setData(undefined, capacities as any);
      // hasHydrated bleibt true – verhindert, dass useEffect den State überschreibt
      hasHydrated.current = true;
      toast.success("Kapazitäten gespeichert!");
      // Im Hintergrund aktualisieren (hasHydrated=true verhindert Überschreiben)
      utils.examiner.getSemesterCapacities.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Fehler beim Speichern");
    }
  };

  const [form, setForm] = useState({
    title: "",
    department: "",
    bio: "",
    researchFocus: "",
    tags: "",
    languages: "",
    studyPrograms: "",
    maxSupervisions: 5,
  });
  const [alternativeEmail, setAlternativeEmail] = useState("");
  const [isSecondExaminer, setIsSecondExaminer] = useState(false);
  const [allowedDepartments, setAllowedDepartments] = useState<string[]>([]);

  // Fachbereich-Zuordnungen laden
  const { data: examinerDepts } = trpc.examiner.getDepartments.useQuery();

  // Profil-Daten in den lokalen State laden (useEffect statt setState im Render-Body)
  useEffect(() => {
    if (!profile) return;
    setForm({
      title: profile.title ?? "",
      department: profile.department ?? "",
      bio: profile.bio ?? "",
      researchFocus: (profile as any).researchFocus ?? "",
      tags: (Array.isArray(profile.tags) ? profile.tags : []).join(", "),
      languages: (Array.isArray(profile.languages) ? profile.languages : []).join(", "),
      studyPrograms: (Array.isArray(profile.studyPrograms) ? profile.studyPrograms : []).join(", "),
      maxSupervisions: profile.maxSupervisions ?? 5,
    });
    setAlternativeEmail((profile as { alternativeEmail?: string | null }).alternativeEmail ?? "");
    setIsSecondExaminer((profile as { isSecondExaminer?: number }).isSecondExaminer === 1);
    // Wenn noch keine Fachbereich-Zuordnungen vorhanden: eigenen Fachbereich als Default setzen
    if (allowedDepartments.length === 0 && profile.department) {
      setAllowedDepartments([profile.department]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.userId ?? (profile as any)?.id]);

  // Fachbereich-Zuordnungen aus DB laden (nach erster Abfrage)
  useEffect(() => {
    if (!examinerDepts || examinerDepts.length === 0) return;
    setAllowedDepartments(examinerDepts.map((d) => d.department));
  }, [examinerDepts?.length]);

  const updateProfile = trpc.examiner.updateProfile.useMutation({
    onSuccess: () => toast.success(t.examiner.toastProfileSaved ?? "Profil gespeichert!"),
    onError: (err) => toast.error(err.message),
  });

  const setAltEmail = trpc.examiner.setAlternativeEmail.useMutation({
    onSuccess: () => toast.success(t.examiner.toastEmailSaved ?? "Alternative E-Mail gespeichert!"),
    onError: (err) => toast.error(err.message),
  });

  const setSecondFlag = trpc.examiner.setSecondExaminerFlag.useMutation({
    onSuccess: () => toast.success(t.examiner.toastRoleSaved ?? "Prüfer:innen-Rolle gespeichert!"),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      title: form.title || undefined,
      department: form.department || undefined,
      bio: form.bio || undefined,
      researchFocus: form.researchFocus || undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      studyPrograms: form.studyPrograms.split(",").map((s) => s.trim()).filter(Boolean),
      maxSupervisions: form.maxSupervisions,
      allowedDepartments: allowedDepartments.length > 0 ? allowedDepartments : undefined,
    });
    // Alternative E-Mail separat speichern
    if (alternativeEmail !== ((profile as { alternativeEmail?: string | null }).alternativeEmail ?? "")) {
      setAltEmail.mutate({ alternativeEmail: alternativeEmail || null });
    }
    // Zweitprüfer:in-Flag separat speichern
    const currentFlag = (profile as { isSecondExaminer?: number }).isSecondExaminer === 1;
    if (isSecondExaminer !== currentFlag) {
      setSecondFlag.mutate({ isSecondExaminer });
    }
  };

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-1">Mein Prüfer:innen-Profil</h2>
        <p className="text-sm text-gray-500 mb-6">
          Dein Profil ist für Studierende sichtbar (ohne Telefonnummer).
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="z.B. Prof. Dr."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Primärer Fachbereich</label>
              <select
                value={form.department}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, department: val }));
                  // Primärfachbereich immer in der Auswahl behalten
                  if (val && !allowedDepartments.includes(val)) {
                    setAllowedDepartments((prev) => [...prev, val]);
                  }
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
              >
                <option value="">Bitte wählen…</option>
                <option value="FB1">FB 1 – Wirtschafts- und Rechtswissenschaften</option>
                <option value="FB2">FB 2 – Informatik und Medien</option>
                <option value="FB3">FB 3 – Ingenieurwissenschaften</option>
                <option value="FB4">FB 4 – Gestaltung und Kultur</option>
                <option value="FB5">FB 5 – Natur- und Technikwissenschaften</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Betreuung auch für andere Fachbereiche
                <span className="ml-1.5 text-xs font-normal text-gray-400">(Mehrfachauswahl möglich)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Ihr primärer Fachbereich ist automatisch ausgewählt. Wählen Sie weitere Fachbereiche, für die Sie Abschlussarbeiten betreuen möchten.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { value: "FB1", label: "FB 1 – Wirtschafts- und Rechtswissenschaften" },
                  { value: "FB2", label: "FB 2 – Informatik und Medien" },
                  { value: "FB3", label: "FB 3 – Ingenieurwissenschaften" },
                  { value: "FB4", label: "FB 4 – Gestaltung und Kultur" },
                  { value: "FB5", label: "FB 5 – Natur- und Technikwissenschaften" },
                ] as const).map((fb) => {
                  const isPrimary = fb.value === form.department;
                  const isChecked = allowedDepartments.includes(fb.value);
                  return (
                    <label
                      key={fb.value}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                        isPrimary
                          ? "border-green-300 bg-green-50 cursor-default"
                          : isChecked
                          ? "border-green-200 bg-green-50/50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked || isPrimary}
                        disabled={isPrimary}
                        onChange={() => {
                          if (isPrimary) return;
                          setAllowedDepartments((prev) =>
                            prev.includes(fb.value)
                              ? prev.filter((d) => d !== fb.value)
                              : [...prev, fb.value]
                          );
                        }}
                        className="accent-green-600 w-4 h-4 shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-tight">
                        {fb.label}
                        {isPrimary && <span className="ml-1.5 text-xs text-green-600 font-medium">(Primär)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kurzbiografie</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Kurze Vorstellung Ihrer Person und Betreuungspräferenzen..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Forschungsschwerpunkte</label>
              <textarea
                rows={3}
                value={form.researchFocus}
                onChange={(e) => setForm((f) => ({ ...f, researchFocus: e.target.value }))}
                placeholder="z.B. Künstliche Intelligenz, Nachhaltigkeit, Marketing..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tags <span className="text-gray-400 font-normal">(kommagetrennt)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="z.B. KI, Machine Learning, NLP"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sprachen <span className="text-gray-400 font-normal">(kommagetrennt)</span>
              </label>
              <input
                type="text"
                value={form.languages}
                onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))}
                placeholder="Deutsch, Englisch"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max. Betreuungen</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.maxSupervisions}
                onChange={(e) => setForm((f) => ({ ...f, maxSupervisions: parseInt(e.target.value) || 5 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              />
            </div>
          </div>

          {/* Prüfer:innen-Rolle: Erst- oder Zweitprüfer:in */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isSecondExaminer}
                onClick={() => setIsSecondExaminer((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSecondExaminer ? "bg-primary" : "bg-gray-200"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSecondExaminer ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">Ich bin Zweitprüfer:in</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aktivieren Sie diese Option, wenn Sie als Zweitprüfer:in agieren und keine HTW-Berlin-E-Mail-Adresse verwenden. Erstprüfer:innen müssen sich mit einer <strong>@htw-berlin.de</strong>- oder <strong>@htw-berlin.com</strong>-Adresse anmelden.
                </p>
              </div>
            </div>
          </div>

          {/* Alternative E-Mail für Zweitprüfer:innen */}
          <div className="border-t border-gray-100 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternative E-Mail-Adresse
              <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Hinterlegen Sie hier eine alternative E-Mail-Adresse, an die Benachrichtigungen und Betreuungsanfragen gesendet werden (z. B. eine externe oder persönliche Adresse). Diese Adresse ersetzt die Anmelde-E-Mail für den E-Mail-Versand.
            </p>
            <input
              type="email"
              value={alternativeEmail}
              onChange={(e) => setAlternativeEmail(e.target.value)}
              placeholder="z.B. vorname.nachname@extern.de"
              className="w-full max-w-sm px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={updateProfile.isPending || setAltEmail.isPending || setSecondFlag.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {updateProfile.isPending ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Profil speichern</>
            )}
          </button>
        </form>
      </div>

      {/* ─── Betreuungskapazitäten pro Semester ─────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#76B90015" }}>
            <svg className="w-5 h-5" style={{ color: "#76B900" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Betreuungskapazitäten</h2>
            <p className="text-xs text-gray-500">Legen Sie fest, wie viele Erst- und Zweitbetreuungen Sie pro Semester übernehmen können.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
                    {/* Tabellenheader */}
          <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            <span className="col-span-1">Semester</span>
            <span className="text-center col-span-2">Erstbetreuungen</span>
            <span className="text-center col-span-2">Zweitbetreuungen</span>
          </div>
          {/* Unterheader */}
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 px-1 -mt-2">
            <span />
            <span className="text-center">Belegt</span>
            <span className="text-center">Max.</span>
            <span className="text-center">Belegt</span>
            <span className="text-center">Max.</span>
          </div>
          {capacities.map((cap, idx) => {
            const usage = (usageData as Array<{ semester: string; usedFirst: number; usedSecond: number }>).find((u) => u.semester === cap.semester);
            const usedFirst = usage?.usedFirst ?? 0;
            const usedSecond = usage?.usedSecond ?? 0;
            const freeFirst = Math.max(0, cap.maxFirst - usedFirst);
            const freeSecond = Math.max(0, cap.maxSecond - usedSecond);
            const overFirst = usedFirst > cap.maxFirst;
            const overSecond = usedSecond > cap.maxSecond;
            return (
            <div key={cap.semester} className="grid grid-cols-5 gap-2 items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-gray-800 col-span-1">{semesterLabel(cap.semester)}</span>
              {/* Erstbetreuungen: belegt */}
              <div className="flex flex-col items-center">
                <span className={`text-sm font-semibold ${overFirst ? 'text-red-600' : 'text-gray-700'}`}>{usedFirst}</span>
                <span className="text-xs text-gray-400">{freeFirst} frei</span>
              </div>
              {/* Erstbetreuungen: max (editierbar) */}
              <div className="flex items-center justify-center gap-1">
                <button type="button" onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxFirst: Math.max(0, c.maxFirst - 1) } : c))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">−</button>
                <span className="w-7 text-center text-sm font-semibold text-gray-900">{cap.maxFirst}</span>
                <button type="button" onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxFirst: Math.min(50, c.maxFirst + 1) } : c))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">+</button>
              </div>
              {/* Zweitbetreuungen: belegt */}
              <div className="flex flex-col items-center">
                <span className={`text-sm font-semibold ${overSecond ? 'text-red-600' : 'text-gray-700'}`}>{usedSecond}</span>
                <span className="text-xs text-gray-400">{freeSecond} frei</span>
              </div>
              {/* Zweitbetreuungen: max (editierbar) */}
              <div className="flex items-center justify-center gap-1">
                <button type="button" onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxSecond: Math.max(0, c.maxSecond - 1) } : c))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">−</button>
                <span className="w-7 text-center text-sm font-semibold text-gray-900">{cap.maxSecond}</span>
                <button type="button" onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxSecond: Math.min(50, c.maxSecond + 1) } : c))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">+</button>
              </div>
            </div>
            );
          })}
          {/* Legende */}
          <p className="text-xs text-gray-400 px-1">Belegt = aktive Zuweisungen · Frei = verbleibende Plätze · Max. = eingestelltes Maximum</p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveCapacities}
            disabled={upsertCapacity.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {upsertCapacity.isPending ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Kapazitäten speichern</>
            )}
          </button>
          <p className="text-xs text-gray-400">Angaben gelten für die kommenden 4 Semester</p>
        </div>
      </div>
    </div>
  );
}

// ─── Studiengang-Einstellungen ────────────────────────────────────────────────
function ProgrammeSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-1">Prüfungsstudiengänge</h2>
        <p className="text-sm text-gray-500 mb-5">Wählen Sie die Studiengänge, in denen Sie Prüfungen abnehmen möchten.</p>
        <ExaminerProgrammeSelector />
      </div>
    </div>
  );
}

// ─── Mini-Avatar-Komponente ──────────────────────────────────────────────────
function MiniAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  if (!name) return null;
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-5 h-5 rounded-full object-cover inline-block border border-gray-200 flex-shrink-0" />
      ) : (
        <span className="w-5 h-5 rounded-full bg-[#76B900]/20 text-[#006937] text-[9px] font-bold inline-flex items-center justify-center flex-shrink-0 border border-[#76B900]/30">{initials}</span>
      )}
      <span>{name}</span>
    </span>
  );
}

// ─── AcceptedStudentsSection ────────────────────────────────────────────────
function AcceptedStudentsSection({ acceptedStudents }: { acceptedStudents: any[] }) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Zweitgutachter-Vorschlag-Modal
  const [suggestModalReq, setSuggestModalReq] = useState<any>(null);
  const [suggestMode, setSuggestMode] = useState<'select' | 'invite'>('select');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [examinerSearch, setExaminerSearch] = useState('');
  const [selectedExaminerId, setSelectedExaminerId] = useState<number | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSuccess, setSuggestSuccess] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  // Resend-Einladung State
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendSuccessId, setResendSuccessId] = useState<number | null>(null);
  // Filter für Prüfer-Auswahl
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const utils = trpc.useUtils();
  const { data: refreshed = [] } = (trpc.examiner as any).getAcceptedRequests.useQuery();
  const list: any[] = (refreshed as any[]).length > 0 ? (refreshed as any[]) : acceptedStudents;

  // Abschnitt 1: Erstgutachter zugesagt, aber noch kein Zweitgutachter vorhanden
  // Status: FIRST_EXAMINER_ACCEPTED oder CONDITIONAL_ACCEPTANCE ohne secondExaminerId
  const firstExaminerOnly = list.filter((r: any) =>
    (r.status === "FIRST_EXAMINER_ACCEPTED" || r.status === "CONDITIONAL_ACCEPTANCE") &&
    !r.secondExaminerId
  );

  // Abschnitt 2: Auf Suche nach Zweitgutachter (PENDING_SECOND_EXAMINER oder SECOND_EXAMINER_ASSIGNED ohne Accepted)
  const searchingSecond = list.filter((r: any) =>
    r.status === "PENDING_SECOND_EXAMINER" ||
    (r.status === "SECOND_EXAMINER_ASSIGNED" && !r.secondExaminerId)
  );

  // Abschnitt 3: Thesis Match – beide Gutachter vorhanden
  const thesisMatch = list.filter((r: any) =>
    r.secondExaminerId != null &&
    ["SECOND_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "SECOND_EXAMINER_SET", "MATCHED", "ACCEPTED", "REGISTERED", "COMPLETED"].includes(r.status)
  );

  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["Titel", "Studierende:r", "E-Mail Studierende:r", "Studiengang", "Semester", "Erstgutachter:in", "Zweitgutachter:in", "Status", "Eingereicht am"];
    const rows = [
      headers,
      ...list.map((r: any) => [
        `"${(r.title ?? "").replace(/"/g, '""')}"`,
        `"${(r.studentName ?? "").replace(/"/g, '""')}"`,
        `"${(r.studentEmail ?? "").replace(/"/g, '""')}"`,
        `"${(r.programmeAbbreviation ?? r.programmeName ?? r.department ?? "").replace(/"/g, '""')}"`,
        `"${(r.targetSemester ?? "").replace(/"/g, '""')}"`,
        `"${(r.firstExaminerName ?? "").replace(/"/g, '""')}"`,
        `"${(r.secondExaminerName ?? "").replace(/"/g, '""')}"`,
        `"${(r.status ?? "").replace(/"/g, '""')}"`,
        `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString("de-DE") : ""}"`,
      ]),
    ];
    downloadCSV(rows, `betreute-studierende-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Prüfer-Liste für Auswahl
  const { data: examinerListData = [] } = (trpc.examiner as any).list.useQuery();
  const allExaminers: any[] = examinerListData as any[];

  // Eindeutige Fachbereiche und Tags aus der Prüfer-Liste
  const allDepartments = Array.from(new Set(
    allExaminers.map((ex: any) => ex.profile?.department ?? '').filter(Boolean)
  )).sort();
  const allTags = Array.from(new Set(
    allExaminers.flatMap((ex: any) => {
      const tags = ex.profile?.tags;
      return Array.isArray(tags) ? tags as string[] : [];
    })
  )).sort();

  // Gefilterte Prüfer (ohne den Erstgutachter selbst)
  const filteredExaminers = allExaminers.filter((ex: any) => {
    if (ex.user?.id === suggestModalReq?.examinerId) return false;
    const q = examinerSearch.toLowerCase();
    const matchesSearch = !q ||
      (ex.user?.name ?? '').toLowerCase().includes(q) ||
      (ex.profile?.department ?? '').toLowerCase().includes(q);
    const matchesDept = !filterDepartment || (ex.profile?.department ?? '') === filterDepartment;
    const matchesTag = !filterTag || (
      Array.isArray(ex.profile?.tags) && (ex.profile.tags as string[]).includes(filterTag)
    );
    return matchesSearch && matchesDept && matchesTag;
  });

  const openSuggestModal = (req: any) => {
    setSuggestModalReq(req);
    setSuggestMode('select');
    setSelectedExaminerId(null);
    setExaminerSearch('');
    setFilterDepartment('');
    setFilterTag('');
    setInviteName('');
    setInviteEmail('');
    setInviteSuccess(false);
    setSuggestSuccess(false);
    setInviteError('');
    setSuggestError('');
  };

  const closeSuggestModal = () => {
    setSuggestModalReq(null);
    setInviteSuccess(false);
    setSuggestSuccess(false);
  };

  const handleSuggestExisting = async () => {
    if (!suggestModalReq || !selectedExaminerId) return;
    setSuggestLoading(true);
    setSuggestError('');
    try {
      await (trpc.thesis as any).setWantedSecondExaminerByFirstExaminer.mutateAsync({
        thesisRequestId: suggestModalReq.id,
        secondExaminerId: selectedExaminerId,
      });
      setSuggestSuccess(true);
      utils.examiner.getAcceptedRequests.invalidate();
    } catch (e: any) {
      setSuggestError(e?.message ?? 'Fehler beim Vorschlagen.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleInviteExternal = async () => {
    if (!suggestModalReq || !inviteName.trim() || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      await (trpc.thesis as any).inviteExternalSecondExaminer.mutateAsync({
        thesisRequestId: suggestModalReq.id,
        inviteeName: inviteName.trim(),
        inviteeEmail: inviteEmail.trim(),
        origin: window.location.origin,
      });
      setInviteSuccess(true);
      utils.examiner.getAcceptedRequests.invalidate();
    } catch (e: any) {
      setInviteError(e?.message ?? 'Fehler beim Einladen.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (reqId: number) => {
    setResendingId(reqId);
    try {
      await (trpc.thesis as any).resendSecondExaminerInvite.mutateAsync({
        thesisRequestId: reqId,
        origin: window.location.origin,
      });
      setResendSuccessId(reqId);
      setTimeout(() => setResendSuccessId(null), 3000);
      utils.examiner.getAcceptedRequests.invalidate();
    } catch (e: any) {
      alert(e?.message ?? 'Fehler beim erneuten Versenden.');
    } finally {
      setResendingId(null);
    }
  };

  const handleExportThesisMatchCSV = () => {
    const headers = [
      "Nr.", "Titel", "Studierende:r", "E-Mail Studierende:r",
      "Studiengang", "Semester", "Abschlussart",
      "Erstgutachter:in", "E-Mail Erstgutachter:in",
      "Zweitgutachter:in", "E-Mail Zweitgutachter:in",
      "Status", "Eingereicht am",
    ];
    const rows = [
      headers,
      ...thesisMatch.map((r: any, i: number) => [
        String(i + 1),
        `"${(r.title ?? "").replace(/"/g, '""')}"`,
        `"${(r.studentName ?? "").replace(/"/g, '""')}"`,
        `"${(r.studentEmail ?? "").replace(/"/g, '""')}"`,
        `"${(r.programmeAbbreviation ?? r.programmeName ?? r.department ?? "").replace(/"/g, '""')}"`,
        `"${(r.targetSemester ?? "").replace(/"/g, '""')}"`,
        `"${r.degreeType === "master" ? "Master" : r.degreeType === "bachelor" ? "Bachelor" : (r.degreeType ?? "")}"`,
        `"${(r.firstExaminerName ?? "").replace(/"/g, '""')}"`,
        `"${(r.firstExaminerEmail ?? "").replace(/"/g, '""')}"`,
        `"${(r.secondExaminerName ?? "").replace(/"/g, '""')}"`,
        `"${(r.secondExaminerEmail ?? "").replace(/"/g, '""')}"`,
        `"${(r.status ?? "").replace(/"/g, '""')}"`,
        `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString("de-DE") : ""}"`,
      ]),
    ];
    downloadCSV(rows, `thesis-match-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const StudentRow = ({ req }: { req: any }) => (
    <button
      onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
      className="w-full text-left py-3 px-3 border-b border-gray-50 last:border-0 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#76B900] transition-colors">
            {req.title || "(kein Titel)"}
          </p>
          {req.studentName && (
            <p className="text-xs font-medium text-[#76B900] mt-0.5">
              <MiniAvatar name={req.studentName} avatarUrl={req.studentAvatarUrl} />
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {(req.programmeAbbreviation ?? req.programmeName ?? req.department) && (
              <span className="text-xs text-gray-500">
                <span className="font-medium">Studiengang:</span>{" "}
                {req.programmeAbbreviation ?? req.programmeName ?? req.department}
              </span>
            )}
            {req.targetSemester && (
              <span className="text-xs text-gray-500">
                <span className="font-medium">Semester:</span>{" "}{req.targetSemester}
              </span>
            )}
            {req.createdAt && (
              <span className="text-xs text-gray-400">
                {new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={req.status} />
          <svg className="w-4 h-4 text-gray-300 group-hover:text-[#76B900] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </button>
  );

  const SectionHeader = ({ title, count, color, onExport }: { title: string; count: number; color: string; onExport?: () => void }) => (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl mb-2 ${color}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs font-medium bg-white/60 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {onExport && (
        <button
          onClick={onExport}
          title="Als CSV exportieren"
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white border border-current/20 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          CSV
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Betreute Studierende</h2>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{list.length}</span>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#76B900] text-[#76B900] hover:bg-[#76B900] hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          CSV exportieren
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine angenommenen Anfragen vorhanden.</p>
      ) : (
        <div className="space-y-6">

          {/* Abschnitt 1: Zusagen als Erstgutachter */}
          {firstExaminerOnly.length > 0 && (
            <div>
              <SectionHeader title="Zusagen als Erstgutachter:in" count={firstExaminerOnly.length} color="bg-[#76B900]/10 text-[#006937]" />
              <div className="space-y-0.5">
                {firstExaminerOnly.map((req: any) => (
                  <div key={req.id} className="group relative">
                    <StudentRow req={req} />
                    {/* Status-Badge: Einladung ausstehend */}
                    {req.secondExaminerInviteToken && !req.secondExaminerId && (
                      <div className="px-3 pb-1 -mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Einladung ausstehend
                          {req.externalSecondExaminerEmail && (
                            <span className="text-orange-500 font-normal">– {req.externalSecondExaminerEmail}</span>
                          )}
                          {req.secondExaminerInviteSentAt && (
                            <span className="text-orange-400 font-normal">
                              ({new Date(req.secondExaminerInviteSentAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })})
                            </span>
                          )}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResendInvite(req.id); }}
                          disabled={resendingId === req.id}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-colors"
                        >
                          {resendSuccessId === req.id ? (
                            <>
                              <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Gesendet!
                            </>
                          ) : resendingId === req.id ? (
                            'Senden...'
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Erneut senden
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {/* Schalter: Zweitgutachter:in vorschlagen */}
                    <div className="px-3 pb-2 -mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openSuggestModal(req); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#76B900]/40 text-[#006937] bg-[#76B900]/5 hover:bg-[#76B900] hover:text-white hover:border-[#76B900] transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        Zweitgutachter:in vorschlagen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abschnitt 2: Auf Suche nach Zweitgutachter */}
          {searchingSecond.length > 0 && (
            <div>
              <SectionHeader title="Auf der Suche nach Zweitgutachter:in" count={searchingSecond.length} color="bg-amber-50 text-amber-800" />
              <div className="space-y-0.5">
                {searchingSecond.map((req: any) => (
                  <button
                    key={req.id}
                    onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                    className="w-full text-left py-3 px-3 border-b border-gray-50 last:border-0 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#76B900] transition-colors">
                          {req.title || "(kein Titel)"}
                        </p>
                        {req.studentName && (
                          <p className="text-xs font-medium text-[#76B900] mt-0.5">
                            <MiniAvatar name={req.studentName} avatarUrl={req.studentAvatarUrl} />
                          </p>
                        )}
                        {/* Zweitgutachter-Suche: angefragte Person prominent anzeigen */}
                        {(req.wantedSecondExaminerName || req.secondExaminerName) && (() => {
                          const name = req.wantedSecondExaminerName ?? req.secondExaminerName;
                          const avatar = req.wantedSecondExaminerAvatarUrl ?? req.secondExaminerAvatarUrl;
                          const profileId = req.wantedSecondExaminerId ?? req.secondExaminerId;
                          const email = req.wantedSecondExaminerEmail ?? req.secondExaminerEmail;
                          const department = (req as any).wantedSecondExaminerDepartment;
                          const phone = (req as any).wantedSecondExaminerPhone;
                          const officeHours = (req as any).wantedSecondExaminerOfficeHours;
                          const academicTitle = (req as any).wantedSecondExaminerAcademicTitle;
                          const requestedAt = (req as any).secondExaminerRequestedAt;
                          const initials = (name as string).split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
                          // Tage seit Anfrage berechnen
                          const daysSince = requestedAt
                            ? Math.floor((Date.now() - new Date(requestedAt).getTime()) / 86400000)
                            : null;
                          const avatarEl = avatar ? (
                            <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover border-2 border-amber-300 flex-shrink-0" />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0 border-2 border-amber-300">{initials}</span>
                          );
                          const nameEl = (
                            <span className="font-semibold text-amber-900">{academicTitle ? `${academicTitle} ${name}` : name}</span>
                          );
                          // Tooltip-Inhalt
                          const tooltip = (
                            <div className="absolute z-50 left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-left pointer-events-none"
                              style={{ minWidth: '220px' }}>
                              <div className="flex items-center gap-2.5 mb-2">
                                {avatar ? (
                                  <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                                ) : (
                                  <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center justify-center flex-shrink-0">{initials}</span>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 leading-tight">{academicTitle ? `${academicTitle} ${name}` : name}</p>
                                  {department && <p className="text-xs text-gray-500 mt-0.5">{department}</p>}
                                </div>
                              </div>
                              <div className="space-y-1 border-t border-gray-50 pt-2">
                                {email && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {email}
                                  </p>
                                )}
                                {phone && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    {phone}
                                  </p>
                                )}
                                {officeHours && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {officeHours}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                          return (
                            <div className="flex items-center justify-between gap-2 mt-1.5 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide whitespace-nowrap">Zweitgutachter:in angefragt</span>
                                <span className="text-amber-300">·</span>
                                <div className="relative group/tooltip">
                                  {profileId ? (
                                    <a
                                      href={`/examiner/profile/${profileId}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:underline text-xs inline-flex items-center gap-2"
                                    >
                                      {avatarEl}{nameEl}
                                    </a>
                                  ) : (
                                    <span className="text-xs inline-flex items-center gap-2">{avatarEl}{nameEl}</span>
                                  )}
                                  <div className="hidden group-hover/tooltip:block">{tooltip}</div>
                                </div>
                              </div>
                              {daysSince !== null && (
                                <span className={`text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  daysSince > 14 ? 'bg-red-100 text-red-700' :
                                  daysSince > 7  ? 'bg-orange-100 text-orange-700' :
                                                   'bg-amber-100 text-amber-700'
                                }`}>
                                  {daysSince === 0 ? 'Heute' : daysSince === 1 ? 'Seit 1 Tag' : `Seit ${daysSince} Tagen`}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {(req.programmeAbbreviation ?? req.programmeName ?? req.department) && (
                            <span className="text-xs text-gray-500">
                              <span className="font-medium">Studiengang:</span>{" "}
                              {req.programmeAbbreviation ?? req.programmeName ?? req.department}
                            </span>
                          )}
                          {req.targetSemester && (
                            <span className="text-xs text-gray-500">
                              <span className="font-medium">Semester:</span>{" "}{req.targetSemester}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#76B900] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Abschnitt 3: Thesis Match – beide Gutachter vorhanden */}
          {thesisMatch.length > 0 && (
            <div>
              <SectionHeader title="Thesis Match" count={thesisMatch.length} color="bg-blue-50 text-blue-800" onExport={handleExportThesisMatchCSV} />
              <div className="space-y-0.5">
                {thesisMatch.map((req: any) => (
                  <button
                    key={req.id}
                    onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                    className="w-full text-left py-3 px-3 border-b border-gray-50 last:border-0 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#76B900] transition-colors">
                          {req.title || "(kein Titel)"}
                        </p>
                        {req.studentName && (
                          <p className="text-xs font-medium text-[#76B900] mt-0.5">
                            <MiniAvatar name={req.studentName} avatarUrl={req.studentAvatarUrl} />
                          </p>
                        )}
                        {/* Erst- und Zweitgutachter anzeigen */}
                        <div className="flex flex-wrap gap-x-4 mt-1">
                          {req.firstExaminerName && (
                            <span className="text-xs text-gray-600">
                              <span className="font-medium text-gray-400">Erst:</span>{" "}
                              <MiniAvatar name={req.firstExaminerName} avatarUrl={req.firstExaminerAvatarUrl} />
                            </span>
                          )}
                          {req.secondExaminerName && (
                            <span className="text-xs text-gray-600">
                              <span className="font-medium text-gray-400">Zweit:</span>{" "}
                              {req.secondExaminerId ? (
                                <a
                                  href={`/examiner/profile/${req.secondExaminerId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="underline hover:text-blue-700 inline-flex items-center gap-1"
                                >
                                  <MiniAvatar name={req.secondExaminerName} avatarUrl={req.secondExaminerAvatarUrl} />
                                </a>
                              ) : (
                                <MiniAvatar name={req.secondExaminerName} avatarUrl={req.secondExaminerAvatarUrl} />
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {(req.programmeAbbreviation ?? req.programmeName ?? req.department) && (
                            <span className="text-xs text-gray-500">
                              <span className="font-medium">Studiengang:</span>{" "}
                              {req.programmeAbbreviation ?? req.programmeName ?? req.department}
                            </span>
                          )}
                          {req.targetSemester && (
                            <span className="text-xs text-gray-500">
                              <span className="font-medium">Semester:</span>{" "}{req.targetSemester}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#76B900] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(firstExaminerOnly.length + searchingSecond.length + thesisMatch.length) === 0 && (
            <p className="text-sm text-gray-500">Keine Einträge vorhanden.</p>
          )}
        </div>
      )}

      {selectedRequest && (
        <RequestDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedRequest(null); }}
          request={selectedRequest}
          onStatusChange={() => (trpc.examiner as any).getAcceptedRequests?.invalidate?.()}
        />
      )}

      {/* Zweitgutachter:in vorschlagen Modal */}
      {suggestModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Zweitgutachter:in vorschlagen</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{suggestModalReq.title}</p>
              </div>
              <button onClick={closeSuggestModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tab-Schalter */}
            <div className="flex border-b border-gray-100 px-6 pt-4 gap-1">
              <button
                onClick={() => setSuggestMode('select')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  suggestMode === 'select' ? 'bg-[#76B900]/10 text-[#006937] border-b-2 border-[#76B900]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Aus Liste wählen
              </button>
              <button
                onClick={() => setSuggestMode('invite')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  suggestMode === 'invite' ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Zweitgutachter:in ins System einladen
              </button>
            </div>

            {/* Inhalt */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* Modus: Aus Liste wählen */}
              {suggestMode === 'select' && (
                <div className="space-y-3">
                  {suggestSuccess ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="w-12 h-12 rounded-full bg-[#76B900]/15 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900">Vorschlag gespeichert!</p>
                      <p className="text-xs text-gray-500 text-center">Der/die Zweitgutachter:in wurde benachrichtigt und kann die Anfrage annehmen oder ablehnen.</p>
                      <button onClick={closeSuggestModal} className="mt-2 px-4 py-2 rounded-lg bg-[#76B900] text-white text-sm font-medium">Schließen</button>
                    </div>
                  ) : (
                    <>
                      {/* Suchfeld */}
                      <input
                        type="text"
                        placeholder="Suche nach Name..."
                        value={examinerSearch}
                        onChange={(e) => setExaminerSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#76B900]/30"
                      />
                      {/* Filter: Fachbereich und Forschungsschwerpunkt */}
                      <div className="flex gap-2">
                        <select
                          value={filterDepartment}
                          onChange={(e) => setFilterDepartment(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 bg-white text-gray-700"
                        >
                          <option value="">Alle Fachbereiche</option>
                          {allDepartments.map((d: string) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <select
                          value={filterTag}
                          onChange={(e) => setFilterTag(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#76B900]/30 bg-white text-gray-700"
                        >
                          <option value="">Alle Schwerpunkte</option>
                          {allTags.map((t: string) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {(filterDepartment || filterTag) && (
                          <button
                            onClick={() => { setFilterDepartment(''); setFilterTag(''); }}
                            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                            title="Filter zurücksetzen"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {/* Ergebnis-Zähler */}
                      <p className="text-xs text-gray-400">{filteredExaminers.length} Prüfer:in{filteredExaminers.length !== 1 ? 'nen' : ''} gefunden</p>
                      <div className="space-y-1 max-h-56 overflow-y-auto">
                        {filteredExaminers.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">Keine Prüfer:innen gefunden.</p>
                        )}
                        {filteredExaminers.map((ex: any) => {
                          const name = ex.user?.name ?? '?';
                          const dept = ex.profile?.department ?? '';
                          const avatar = ex.profile?.photoUrl ?? ex.user?.avatarUrl;
                          const initials = name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
                          const isSelected = selectedExaminerId === ex.user?.id;
                          const tags: string[] = Array.isArray(ex.profile?.tags) ? ex.profile.tags : [];
                          return (
                            <button
                              key={ex.user?.id}
                              onClick={() => setSelectedExaminerId(ex.user?.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                isSelected ? 'bg-[#76B900]/10 border border-[#76B900]/40' : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              {avatar ? (
                                <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-bold inline-flex items-center justify-center flex-shrink-0">{initials}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                                {dept && <p className="text-xs text-gray-500 truncate">{dept}</p>}
                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {tags.slice(0, 3).map((tag: string) => (
                                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${filterTag === tag ? 'bg-[#76B900]/15 border-[#76B900]/40 text-[#006937] font-medium' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>{tag}</span>
                                    ))}
                                    {tags.length > 3 && <span className="text-[10px] text-gray-400">+{tags.length - 3}</span>}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <svg className="w-4 h-4 text-[#76B900] ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {suggestError && <p className="text-xs text-red-600">{suggestError}</p>}
                    </>
                  )}
                </div>
              )}

              {/* Modus: Externe Person einladen */}
              {suggestMode === 'invite' && (
                <div className="space-y-4">
                  {inviteSuccess ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900">Einladung versendet!</p>
                      <p className="text-xs text-gray-500 text-center">Die Person erhält eine E-Mail mit einem Registrierungslink und wird automatisch dieser Anfrage zugeordnet.</p>
                      <button onClick={closeSuggestModal} className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">Schließen</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">Die eingeladene Person erhält eine E-Mail mit einem Registrierungslink. Nach der Registrierung wird sie automatisch als Zweitgutachter:in für diese Anfrage vorgemerkt.</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Vollständiger Name</label>
                          <input
                            type="text"
                            placeholder="z. B. Prof. Dr. Maria Müller"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail-Adresse</label>
                          <input
                            type="email"
                            placeholder="vorname.nachname@htw-berlin.de"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        </div>
                      </div>
                      {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!suggestSuccess && !inviteSuccess && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={closeSuggestModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Abbrechen</button>
                {suggestMode === 'select' ? (
                  <button
                    onClick={handleSuggestExisting}
                    disabled={!selectedExaminerId || suggestLoading}
                    className="px-5 py-2 rounded-lg bg-[#76B900] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#5a8c00] transition-colors"
                  >
                    {suggestLoading ? 'Speichern...' : 'Vorschlag speichern'}
                  </button>
                ) : (
                  <button
                    onClick={handleInviteExternal}
                    disabled={!inviteName.trim() || !inviteEmail.trim() || inviteLoading}
                    className="px-5 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
                  >
                    {inviteLoading ? 'Einladung wird gesendet...' : 'Einladung senden'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const { t } = useLanguage();
  const { data: requests } = trpc.thesis.examinerRequests.useQuery();
  const { data: acceptedStudents = [] } = (trpc.examiner as any).getAcceptedRequests.useQuery();
  const { data: savedCapacities = [] } = trpc.examiner.getSemesterCapacities.useQuery(undefined, { refetchOnMount: 'always' });
  const { data: usageData = [] } = trpc.examiner.getCapacityUsage.useQuery(undefined, { refetchOnMount: 'always' });
  const { data: myProfile } = trpc.examiner.myProfile.useQuery();
  const roleStatus = (myProfile as any)?.roleStatus ?? 'approved';
  const requestsAny = (requests ?? []) as any[];
  const ACCEPTED_STATUSES = ["FIRST_EXAMINER_ACCEPTED", "SECOND_EXAMINER_ASSIGNED", "ACCEPTED", "MATCHED", "REGISTERED", "COMPLETED"];
  const PENDING_STATUSES = ["PENDING", "PENDING_FIRST_EXAMINER", "PENDING_SECOND_EXAMINER"];
  const stats = {
    total: requestsAny.length,
    pending: requestsAny.filter((r: any) => PENDING_STATUSES.includes(r.status)).length,
    conditional: requestsAny.filter((r: any) => r.status === "CONDITIONAL_ACCEPTANCE").length,
    accepted: requestsAny.filter((r: any) => ACCEPTED_STATUSES.includes(r.status)).length,
    rejected: requestsAny.filter((r: any) => r.status === "REJECTED" || r.status === "FIRST_EXAMINER_REJECTED").length,
    matched: requestsAny.filter((r: any) => r.status === "MATCHED" || r.status === "SECOND_EXAMINER_ASSIGNED").length,
  };
  // Auslastung: nur Semester mit gespeicherten Kapazitäten oder aktiver Nutzung
  const capacityRows = (() => {
    const allSems = new Set([
      ...(savedCapacities as Array<{ semester: string; maxFirst: number; maxSecond: number }>).map((c) => c.semester),
      ...(usageData as Array<{ semester: string; usedFirst: number; usedSecond: number }>).map((u) => u.semester),
    ]);
    return sortSemesters(Array.from(allSems)).map((sem) => {
      const cap = (savedCapacities as Array<{ semester: string; maxFirst: number; maxSecond: number }>).find((c) => c.semester === sem);
      const usage = (usageData as Array<{ semester: string; usedFirst: number; usedSecond: number }>).find((u) => u.semester === sem);
      return {
        semester: sem,
        maxFirst: cap?.maxFirst ?? 0,
        maxSecond: cap?.maxSecond ?? 0,
        usedFirst: usage?.usedFirst ?? 0,
        usedSecond: usage?.usedSecond ?? 0,
      };
    });
  })();

  const utils = trpc.useUtils();

  return (
    <div className="space-y-6">
      {/* Freischaltungs-Hinweis */}
      {roleStatus === 'pending' && (
        <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Profil wartet auf Freischaltung</p>
            <p className="text-amber-700 text-sm mt-1">
              Ihr Profil wurde erfolgreich eingerichtet und der Verwaltung zur Prüfung vorgelegt.
              Sobald Ihr Konto freigeschaltet wurde, erhalten Sie eine Bestätigungs-E-Mail und können
              Betreuungsanfragen von Studierenden entgegennehmen.
            </p>
          </div>
        </div>
      )}
      {roleStatus === 'rejected' && (
        <div className="flex items-start gap-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 text-sm">Freischaltung abgelehnt</p>
            <p className="text-red-700 text-sm mt-1">
              Ihre Freischaltungsanfrage wurde leider abgelehnt. Bitte wenden Sie sich an die Verwaltung
              unter{' '}
              <a href="mailto:pruefungsamt@htw-berlin.de" className="underline font-medium">pruefungsamt@htw-berlin.de</a>{' '}
              für weitere Informationen.
            </p>
          </div>
        </div>
      )}

      {/* Einladungsformular */}
      <div className="flex justify-end">
        <InviteStudentForm onSuccess={() => {
          utils.thesis.examinerRequests.invalidate();
          utils.invite.getMyDrafts.invalidate();
        }} />
      </div>

      {/* Ausstehende Einladungen */}
      <PendingInvitationsPanel onChanged={() => utils.thesis.examinerRequests.invalidate()} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          { label: t.examiner.statsTotal ?? "Gesamt", value: stats.total, color: "text-gray-900" },
          { label: t.examiner.statsOpen ?? "Offen", value: stats.pending, color: "text-amber-600" },
          { label: t.examiner.statsConditional ?? "Unter Vorbehalt", value: stats.conditional, color: "text-orange-500" },
          { label: t.examiner.statsAccepted ?? "Angenommen", value: stats.accepted, color: "text-primary" },
          { label: t.examiner.statsRejected ?? "Abgelehnt", value: stats.rejected, color: "text-red-500" },
          { label: t.examiner.statsMatched ?? "Matched", value: stats.matched, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
        {/* Zweitgutachter-Status-Kachel */}
        {(() => {
          const isSecond = (myProfile as any)?.isSecondExaminer === 1;
          return (
            <div className={`rounded-2xl p-5 border shadow-sm ${
              isSecond ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isSecond ? "bg-green-500" : "bg-gray-300"
                }`} />
                <span className={`text-sm font-bold ${
                  isSecond ? "text-green-700" : "text-gray-400"
                }`}>{isSecond ? "Ja" : "Nein"}</span>
              </div>
              <div className="text-sm text-gray-500 leading-tight">Zweitgutachter:in</div>
            </div>
          );
        })()}
      </div>

      {/* Auslastungsübersicht */}
      {capacityRows.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Betreuungsauslastung</h2>
          <div className="overflow-x-auto">
          <div className="space-y-2 min-w-[360px]">
            {/* Header */}
            <div className="grid grid-cols-5 gap-2 px-4 pb-1">
              <span className="text-xs font-medium text-gray-400 col-span-1">Semester</span>
              <span className="text-xs font-medium text-gray-400 text-center">Erst belegt</span>
              <span className="text-xs font-medium text-gray-400 text-center">Erst max.</span>
              <span className="text-xs font-medium text-gray-400 text-center">Zweit belegt</span>
              <span className="text-xs font-medium text-gray-400 text-center">Zweit max.</span>
            </div>
            {capacityRows.map((row) => {
              const freeFirst = Math.max(0, row.maxFirst - row.usedFirst);
              const freeSecond = Math.max(0, row.maxSecond - row.usedSecond);
              const overFirst = row.usedFirst > row.maxFirst && row.maxFirst > 0;
              const overSecond = row.usedSecond > row.maxSecond && row.maxSecond > 0;
              return (
                <div key={row.semester} className="grid grid-cols-5 gap-2 items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-gray-800 col-span-1">{row.semester}</span>
                  <div className="flex flex-col items-center">
                    <span className={`text-sm font-semibold ${overFirst ? 'text-red-600' : 'text-gray-700'}`}>{row.usedFirst}</span>
                    <span className="text-xs text-gray-400">{freeFirst} frei</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500">{row.maxFirst}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-sm font-semibold ${overSecond ? 'text-red-600' : 'text-gray-700'}`}>{row.usedSecond}</span>
                    <span className="text-xs text-gray-400">{freeSecond} frei</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-500">{row.maxSecond}</span>
                  </div>
                </div>
              );
            })}
          </div>{/* end min-w-[360px] */}
          </div>{/* end overflow-x-auto */}
          <p className="text-xs text-gray-400 mt-3 px-1">Kapazitäten können unter Mein Profil angepasst werden.</p>
        </div>
      )}

      {/* Betreute Studierende */}
      <AcceptedStudentsSection acceptedStudents={acceptedStudents as any[]} />

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Neueste Anfragen</h2>
          <a href="/examiner/requests" className="text-xs text-[#76B900] hover:underline font-medium">Alle anzeigen →</a>
        </div>
        {!requests?.length ? (
          <p className="text-sm text-gray-500">Noch keine Anfragen vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {(requests as any[]).slice(0, 5).map((req: any) => (
              <div key={req.id} className="py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{req.title || "(kein Titel)"}</p>
                    {req.studentName && (
                      <p className="text-xs font-medium text-[#76B900] mt-0.5">{req.studentName}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {(req.programmeAbbreviation ?? req.programmeName ?? req.department) && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Study Programme:</span>{" "}
                          {req.programmeAbbreviation ?? req.programmeName ?? req.department}
                        </span>
                      )}
                      {req.targetSemester && (
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Semester:</span>{" "}{req.targetSemester}
                        </span>
                      )}
                      {req.createdAt && (
                        <span className="text-xs text-gray-400">
                          {new Date(req.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {/* Beteiligte Personen – Tabelle */}
                    {(() => {
                      const rows: PersonRow[] = [];
                      if (req.studentName) rows.push({ role: "Studierende:r", name: req.studentName, contact: req.studentEmail ?? "", status: req.programmeAbbreviation ?? req.programmeName ?? req.department ?? "" });
                      if (req.examinerId) rows.push({ role: "Erstgutachter:in", name: req.firstExaminerName ?? "–", contact: req.firstExaminerEmail ?? "", profileId: req.examinerId, status: "zugewiesen" });
                      else if (req.wantedExaminerName) rows.push({ role: "Erstgutachter:in", name: req.wantedExaminerName, contact: "", status: "angefragt" });
                      if (req.secondExaminerId) rows.push({ role: "Zweitgutachter:in", name: req.secondExaminerName ?? "–", contact: req.secondExaminerEmail ?? "", profileId: req.secondExaminerId, status: "zugewiesen" });
                      else if (req.wantedSecondExaminerName) rows.push({ role: "Zweitgutachter:in", name: req.wantedSecondExaminerName, contact: req.wantedSecondExaminerEmail ?? "", status: "angefragt" });
                      if (rows.length === 0) return null;
                      return <div className="mt-2"><InvolvedPersonsTable rows={rows} compact /></div>;
                    })()}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── My Colloquiums (Examiner) ──────────────────────────────────────────────────────────
function MyColloquiums() {
  const { t } = useLanguage();
  const { data: colloquiums, isLoading } = trpc.colloquium.myExaminerColloquiums.useQuery();
  if (isLoading) return <div className="text-sm text-gray-500">Wird geladen...</div>;
  if (!colloquiums?.length) return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <p className="text-sm font-medium text-gray-700">Keine Kolloquien geplant</p>
      <p className="text-xs text-gray-500 mt-1">Sobald ein Termin angelegt wird, erscheint er hier.</p>
    </div>
  );
  return (
    <div className="space-y-4">
      {colloquiums.map((col) => (
        <div key={col.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{col.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date(col.scheduledAt).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}
              </p>
              {(col.location || col.room) && (
                <p className="text-sm text-gray-600 mt-1">{[col.location, col.room].filter(Boolean).join(" – ")}</p>
              )}
              {col.notes && <p className="text-xs text-gray-500 mt-2 italic">{col.notes}</p>}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              col.status === "SCHEDULED" ? "bg-blue-50 text-blue-700" :
              col.status === "COMPLETED" ? "bg-primary/5 text-primary" :
              "bg-red-50 text-red-700"
            }`}>{col.status === "SCHEDULED" ? (t.examiner.colStatusScheduled ?? "Geplant") : col.status === "COMPLETED" ? (t.examiner.colStatusCompleted ?? "Abgeschlossen") : (t.examiner.colStatusCancelled ?? "Abgesagt")}</span>
          </div>
          <a
            href={`/api/ics/colloquium/${col.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#76B900" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Zum Kalender hinzufügen (.ics)
          </a>
        </div>
      ))}
    </div>
  );
}


// ─── Statushistorie (Prüfer:in) ───────────────────────────────────────────────
function ExaminerStatusHistory() {
  const { t } = useLanguage();
  const { data: assignments, isLoading } = trpc.thesis.examinerRequests.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: logs } = trpc.auditLog.byThesis.useQuery(
    { thesisRequestId: selectedId! },
    { enabled: selectedId !== null }
  );
  if (isLoading) return <div className="text-sm text-gray-500">Wird geladen...</div>;
  if (!assignments?.length) return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <p className="text-sm text-gray-500">Keine betreuten Abschlussarbeiten vorhanden.</p>
    </div>
  );
  // Alle verfügbaren Semester aus den Zuweisungen extrahieren (chronologisch sortiert)
  const allSemesters = sortSemesters(
    Array.from(
      new Set(
        (assignments as Array<{ targetSemester?: string | null }>)
          .map((r) => r.targetSemester)
          .filter((s): s is string => !!s)
      )
    )
  );
  // Gefilterte Zuweisungen (Semester + Suche)
  const filteredAssignments = (assignments as Array<{ id: number; title: string; studentName?: string; targetSemester?: string | null; programmeAbbreviation?: string | null }>)
    .filter((r) => semesterFilter === "all" || r.targetSemester === semesterFilter)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (r.studentName ?? "").toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.programmeAbbreviation ?? "").toLowerCase().includes(q)
      );
    });
  const actionLabel: Record<string, string> = {
    THESIS_CREATED: t.examiner.auditThesisCreated ?? "Anfrage eingereicht",
    STATUS_CHANGED: t.examiner.auditStatusChanged ?? "Status geändert",
    EXAMINER_ACCEPTED: t.examiner.auditExaminerAccepted ?? "Prüfer:in hat angenommen",
    EXAMINER_REJECTED: t.examiner.auditExaminerRejected ?? "Prüfer:in hat abgelehnt",
    FIRST_EXAMINER_ASSIGNED: t.examiner.auditFirstAssigned ?? "Erstprüfer:in zugewiesen",
    SECOND_EXAMINER_ASSIGNED: t.examiner.auditSecondAssigned ?? "Zweitprüfer:in zugewiesen",
    COLLOQUIUM_CREATED: t.examiner.auditColloquiumCreated ?? "Kolloquium angelegt",
    DEADLINE_SET: t.examiner.auditDeadlineSet ?? "Abgabefrist gesetzt",
  };
  return (
    <div className="space-y-5">
      {/* Suchfeld */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
        <input
          type="text"
          placeholder="Nach Name oder Titel suchen..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedId(null); }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
          style={{ '--tw-ring-color': '#76B900' } as React.CSSProperties}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setSelectedId(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >×</button>
        )}
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        {/* Semesterfilter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
          <select
            value={semesterFilter}
            onChange={(e) => { setSemesterFilter(e.target.value); setSelectedId(null); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            <option value="all">Alle Semester</option>
            {allSemesters.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* Thesis-Auswahl */}
        <div className="flex-1 min-w-[260px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Abschlussarbeit</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
          >
            <option value="">-- Bitte wählen --</option>
            {filteredAssignments.map((r) => (
              <option key={r.id} value={r.id}>
                {r.studentName
                  ? `${r.studentName}${r.programmeAbbreviation ? ` (${r.programmeAbbreviation})` : ""} – ${r.title}`
                  : r.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedId && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">{t.examiner.history ?? "Thesis Status"}</h3>
          {!logs?.length ? (
            <p className="text-sm text-gray-500">Noch keine Einträge.</p>
          ) : (
            <ol className="relative border-l-2" style={{ borderColor: "#76B900" }}>
              {logs.map((log, i) => (
                <li key={log.id} className={`ml-6 ${i < logs.length - 1 ? "mb-6" : ""}`}>
                  <span
                    className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white"
                    style={{ backgroundColor: "#76B900" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div className="pl-2">
                    <p className="text-sm font-semibold text-gray-900">{actionLabel[log.action] ?? log.action}</p>
                    {log.fromStatus && log.toStatus && (
                      <p className="text-xs text-gray-500">{log.fromStatus} → {log.toStatus}</p>
                    )}
                    {log.reason && <p className="text-xs text-gray-500 italic mt-0.5">Begründung: {log.reason}</p>}
                    <time className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("de-DE")}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
// ─── Onboarding Modal ────────────────────────────────────────────────────────
function ExaminerOnboardingModal({ onComplete }: { onComplete: () => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"role" | "email">("role");
  const [isSecondExaminer, setIsSecondExaminer] = useState<boolean | null>(null);
  const [alternativeEmail, setAlternativeEmail] = useState("");
  const utils = trpc.useUtils();

  const completeOnboarding = trpc.examiner.completeOnboarding.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const handleFinish = async () => {
    if (isSecondExaminer === null) return;
    await completeOnboarding.mutateAsync({
      isSecondExaminer,
      alternativeEmail: alternativeEmail || null,
    });
    utils.examiner.myProfile.invalidate();
    toast.success(t.examiner.toastOnboardingDone ?? "Profil eingerichtet – willkommen!");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Willkommen</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Profil einrichten</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bitte beantworten Sie kurz zwei Fragen, damit das System Ihnen die richtigen Anfragen zuordnen kann.
          </p>
        </div>

        {/* Progress */}
        <div className="px-8 pb-2">
          <div className="flex gap-2">
            <div className="h-1 flex-1 rounded-full bg-primary" />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === "email" ? "bg-primary" : "bg-gray-200"}`} />
          </div>
        </div>

        {/* Step 1: Rolle */}
        {step === "role" && (
          <div className="px-8 py-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700">In welcher Rolle sind Sie an der HTW Berlin tätig?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsSecondExaminer(false)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSecondExaminer === false
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                <span className="text-sm font-semibold">Erstprüfer:in</span>
                <span className="text-xs text-center opacity-70">HTW-Berlin-Lehrperson</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSecondExaminer(true)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSecondExaminer === true
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm font-semibold">Zweitprüfer:in</span>
                <span className="text-xs text-center opacity-70">Externe Fachperson</span>
              </button>
            </div>
            {isSecondExaminer === false && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                Als Erstprüfer:in müssen Sie sich mit einer <strong>@htw-berlin.de</strong>- oder <strong>@htw-berlin.com</strong>-E-Mail-Adresse anmelden.
              </p>
            )}
            {isSecondExaminer === true && (
              <p className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
                Als Zweitprüfer:in können Sie auch eine externe E-Mail-Adresse verwenden.
              </p>
            )}
            <button
              type="button"
              disabled={isSecondExaminer === null}
              onClick={() => setStep("email")}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: "#76B900" }}
            >
              Weiter
            </button>
          </div>
        )}

        {/* Step 2: Alternative E-Mail */}
        {step === "email" && (
          <div className="px-8 py-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Alternative E-Mail-Adresse</p>
            <p className="text-xs text-gray-500">
              Optional: Hinterlegen Sie eine E-Mail-Adresse, an die Betreuungsanfragen und Benachrichtigungen gesendet werden sollen. Diese ersetzt die Anmelde-E-Mail für den E-Mail-Versand.
            </p>
            <input
              type="email"
              value={alternativeEmail}
              onChange={(e) => setAlternativeEmail(e.target.value)}
              placeholder="z.B. vorname.nachname@extern.de"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("role")}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={completeOnboarding.isPending}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40"
                style={{ backgroundColor: "#76B900" }}
              >
                {completeOnboarding.isPending ? (t.onboarding.completing ?? "Speichern...") : (t.onboarding.finish ?? "Einrichtung abschließen")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Drag-and-Drop Hilfselemente ─────────────────────────────────────────────

// ─── Kandidaten-Tooltip ─────────────────────────────────────────────────────

function CandidateTooltip({ candidate }: { candidate: any }) {
  const active = candidate.activeSupervisions ?? 0;
  const max = candidate.maxSupervisions ?? 5;
  const pct = Math.min(100, Math.round((active / Math.max(max, 1)) * 100));
  const tags: string[] = Array.isArray(candidate.tags)
    ? candidate.tags
    : typeof candidate.tags === "string"
    ? (() => { try { return JSON.parse(candidate.tags); } catch { return []; } })()
    : [];

  const loadColor =
    pct >= 90 ? "bg-red-500" :
    pct >= 60 ? "bg-amber-400" :
    "bg-[#76B900]";
  const loadLabel =
    pct >= 90 ? "Ausgelastet" :
    pct >= 60 ? "Teilweise ausgelastet" :
    "Verfügbar";
  const loadTextColor =
    pct >= 90 ? "text-red-600" :
    pct >= 60 ? "text-amber-600" :
    "text-[#76B900]";

  return (
    <div className="absolute z-50 left-full top-0 ml-3 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-4 pointer-events-none">
      {/* Pfeil */}
      <div className="absolute -left-2 top-4 w-3 h-3 rotate-45 bg-white border-l border-b border-gray-200" />

      {/* Kopfzeile */}
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar name={buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })}</p>
        </div>
      </div>

      {/* Institut */}
      {candidate.department && (
        <div className="flex items-start gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-xs text-gray-600 leading-tight">{candidate.department}</p>
        </div>
      )}

      {/* Auslastung */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Aktive Betreuungen</span>
          <span className={`text-xs font-semibold ${loadTextColor}`}>{loadLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${loadColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">{active} / {max}</span>
        </div>
      </div>

      {/* Forschungsgebiete */}
      {candidate.researchFocus && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Forschungsgebiete</p>
          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{candidate.researchFocus}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 4).map((tag: string, i: number) => (
            <span key={i} className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]">{tag}</span>
          ))}
          {tags.length > 4 && (
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 text-[10px]">+{tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Sprechstunden */}
      {candidate.officeHours && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-gray-500 truncate">{candidate.officeHours}</p>
        </div>
      )}
    </div>
  );
}

/** Einzelnes Element in der linken (verfügbaren) Liste – nur draggable */
function AvailableItem({ candidate, onAdd }: { candidate: any; onAdd: (id: number) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `available-${candidate.id}`,
    data: { type: "available", candidateId: candidate.id },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 px-4 py-3 hover:bg-[#76B900]/5 transition-colors group border-b border-gray-50 last:border-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && !isDragging && <CandidateTooltip candidate={candidate} />}

      {/* Drag-Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        title="Ziehen zum Verschieben"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <UserAvatar name={buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })}</p>
        <WorkloadBadge
          active={candidate.activeSupervisions}
          max={candidate.maxSupervisions}
          compact
          className="mt-1"
        />
      </div>
      <button
        onClick={() => onAdd(candidate.id)}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-[#76B900]/10 hover:bg-[#76B900]/30 flex items-center justify-center transition-colors"
        title="Hinzufügen"
      >
        <svg className="w-3.5 h-3.5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/** Einzelnes Element in der rechten (ausgewählten) Liste – sortierbar und draggable */
function SelectedItem({ candidate, index, onRemove }: { candidate: any; index: number; onRemove: (id: number) => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `selected-${candidate.id}`,
    data: { type: "selected", candidateId: candidate.id },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 px-4 py-3 hover:bg-[#76B900]/10 transition-colors group border-b border-[#76B900]/10 last:border-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip – auf der linken Seite (da rechte Liste am Rand) */}
      {showTooltip && !isDragging && (
        <div className="absolute z-50 right-full top-0 mr-3 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-4 pointer-events-none">
          <div className="absolute -right-2 top-4 w-3 h-3 rotate-45 bg-white border-r border-t border-gray-200" />
          <CandidateTooltip candidate={candidate} />
        </div>
      )}

      {/* Rang-Badge */}
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#76B900]/20 text-[#76B900] text-[10px] font-bold flex items-center justify-center">{index + 1}</span>
      {/* Drag-Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-[#76B900]/40 hover:text-[#76B900] cursor-grab active:cursor-grabbing"
        title="Reihenfolge ändern"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <UserAvatar name={buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{buildFullName({ firstName: (candidate as any).firstName, lastName: (candidate as any).lastName, academicTitle: (candidate as any).academicTitle ?? candidate.title, name: candidate.name })}</p>
        <WorkloadBadge
          active={candidate.activeSupervisions}
          max={candidate.maxSupervisions}
          compact
          className="mt-1"
        />
      </div>
      <button
        onClick={() => onRemove(candidate.id)}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
        title="Entfernen"
      >
        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Drop-Zone für die rechte Liste (wenn leer) */
function SelectedDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div className={`px-4 py-8 text-center transition-colors ${
      isOver ? "bg-[#76B900]/10" : ""
    }`}>
      <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
        isOver ? "bg-[#76B900]/30" : "bg-gray-100"
      }`}>
        <svg className={`w-5 h-5 transition-colors ${ isOver ? "text-[#76B900]" : "text-gray-400" }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="text-xs text-gray-400">
        {isOver ? (
          <span className="text-[#76B900] font-medium">Hier ablegen</span>
        ) : (
          <>Noch keine Präferenzen gewählt.<br/><span className="text-[#76B900]">Klicken oder hierher ziehen.</span></>
        )}
      </p>
    </div>
  );
}


// ─── TopicStudentsList ────────────────────────────────────────────────────────
function TopicStudentsList({ topicId }: { topicId: number }) {
  const { data: students = [], isLoading } = trpc.thesisPhase27.getStudentsByTopic.useQuery({ topicId });
  if (isLoading) return <p className="text-xs text-gray-400">Lade Studierende…</p>;
  if (students.length === 0) return <p className="text-xs text-gray-400">Keine Studierenden zugeordnet.</p>;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1.5">Vergebene Studierende:</p>
      <div className="space-y-1.5">
        {students.map((s: any) => (
          <div key={s.requestId} className="flex items-center gap-2">
            {s.studentAvatarUrl ? (
              <img src={s.studentAvatarUrl} alt={s.studentName ?? ""} className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-gray-500">{(s.studentName ?? "?")[0]?.toUpperCase()}</span>
              </div>
            )}
            <a href={`/profile/${s.studentId}`} className="text-xs font-medium text-[#4a7a00] hover:underline">{s.studentName}</a>
            <span className="text-xs text-gray-400">• {s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── Examiner Topics Manager ──────────────────────────────────────────────────────
function ExaminerTopicsManager() {
  const utils = trpc.useUtils();
  const { data: topics = [], isLoading } = trpc.thesisPhase27.getMyTopics.useQuery();
  const semesters = getNextSemesters();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    validFromSemester: "",
    validUntilSemester: "",
    degreeType: "" as "" | "bachelor" | "master",
    language: "de" as "de" | "en" | "both",
    allowMultiple: 1 as 0 | 1,
    maxAssignments: "" as string,
    tags: "",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);
  const [increaseLimitTopicId, setIncreaseLimitTopicId] = useState<number | null>(null);
  const [newLimitValue, setNewLimitValue] = useState<string>("");

  const increaseTopicLimitMutation = trpc.thesisPhase27.increaseTopicLimit.useMutation({
    onSuccess: () => { toast.success("Vergabelimit erfolgreich erhöht."); utils.thesisPhase27.getMyTopics.invalidate(); setIncreaseLimitTopicId(null); setNewLimitValue(""); },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.thesisPhase27.createTopic.useMutation({
    onSuccess: () => { toast.success("Thema erfolgreich angelegt."); utils.thesisPhase27.getMyTopics.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.thesisPhase27.updateTopic.useMutation({
    onSuccess: () => { toast.success("Thema aktualisiert."); utils.thesisPhase27.getMyTopics.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.thesisPhase27.deleteTopic.useMutation({
    onSuccess: () => { toast.success("Thema gelöscht."); utils.thesisPhase27.getMyTopics.invalidate(); setDeleteConfirmId(null); },
    onError: (e) => toast.error(e.message),
  });
  const toggleActiveMutation = trpc.thesisPhase27.updateTopic.useMutation({
    onSuccess: () => utils.thesisPhase27.getMyTopics.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ title: "", description: "", validFromSemester: "", validUntilSemester: "", degreeType: "", language: "de", allowMultiple: 1, maxAssignments: "", tags: "" });
    setShowForm(false); setEditingId(null);
  }
  function startEdit(topic: any) {
    setForm({ title: topic.title, description: topic.description, validFromSemester: topic.validFromSemester ?? "", validUntilSemester: topic.validUntilSemester ?? "", degreeType: topic.degreeType ?? "", language: (topic.language ?? "de") as "de" | "en" | "both", allowMultiple: topic.allowMultiple ?? 1, maxAssignments: topic.maxAssignments != null ? String(topic.maxAssignments) : "", tags: topic.tags ?? "" });
    setEditingId(topic.id); setShowForm(true);
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const maxVal = form.maxAssignments.trim() ? parseInt(form.maxAssignments.trim(), 10) : null;
    const payload = { title: form.title.trim(), description: form.description.trim(), validFromSemester: form.validFromSemester || null, validUntilSemester: form.validUntilSemester || null, degreeType: (form.degreeType || null) as "bachelor" | "master" | null | undefined, language: form.language, allowMultiple: form.allowMultiple, maxAssignments: maxVal, tags: form.tags.trim() || null };
    if (editingId) { updateMutation.mutate({ id: editingId, ...payload }); } else { createMutation.mutate(payload); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">Themenvorschläge für Studierende</p>
        <p className="text-xs text-blue-700">Hier können Sie Themen veröffentlichen, die Studierende direkt auswählen können. Aktive Themen erscheinen im Anfrageformular der Studierenden als dritte Option neben eigenem Thema und Themenzuteilung.</p>
      </div>
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#76B900" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Neues Thema anlegen
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editingId ? "Thema bearbeiten" : "Neues Thema anlegen"}</h3>
          <div>
            <Label htmlFor="topic-title">Titel <span className="text-red-500">*</span></Label>
            <Input id="topic-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z. B. Nachhaltigkeit in der Lieferkette" required maxLength={512} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="topic-desc">Kurzbeschreibung <span className="text-red-500">*</span></Label>
            <Textarea id="topic-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Beschreiben Sie das Thema, mögliche Fragestellungen und Anforderungen." required rows={4} className="mt-1" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Gültig ab Semester</Label>
              <Select value={form.validFromSemester || "all"} onValueChange={v => setForm(f => ({ ...f, validFromSemester: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Alle zukünftigen Semester" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle zukünftigen Semester</SelectItem>
                  {semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gültig bis Semester</Label>
              <Select value={form.validUntilSemester || "all"} onValueChange={v => setForm(f => ({ ...f, validUntilSemester: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Kein Enddatum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kein Enddatum</SelectItem>
                  {semesters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Abschlussart</Label>
              <Select value={form.degreeType || "all"} onValueChange={v => setForm(f => ({ ...f, degreeType: v === "all" ? "" : v as "bachelor" | "master" }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Beide" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Beide (Bachelor & Master)</SelectItem>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sprache der Arbeit</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v as "de" | "en" | "both" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">Englisch</SelectItem>
                  <SelectItem value="both">Deutsch & Englisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Tags */}
          <div>
            <Label htmlFor="topic-tags">Schlagwörter (Tags)</Label>
            <Input id="topic-tags" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="z. B. KI, Nachhaltigkeit, Logistik (kommagetrennt)" maxLength={512} className="mt-1" />
            <p className="text-xs text-gray-400 mt-0.5">Kommagetrennte Schlagwörter werden als farbige Badges angezeigt.</p>
          </div>
          {/* Mehrfachvergabe */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, allowMultiple: f.allowMultiple ? 0 : 1 }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ form.allowMultiple ? 'bg-[#76B900]' : 'bg-gray-300' }`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${ form.allowMultiple ? 'translate-x-4.5' : 'translate-x-0.5' }`} />
            </button>
            <span className="text-sm text-gray-700">Mehrfachvergabe erlaubt <span className="text-xs text-gray-400">(Thema kann von mehreren Studierenden gewählt werden)</span></span>
          </div>
          {/* Maximale Vergaben */}
          <div className="flex items-center gap-3">
            <div className="w-28">
              <Label htmlFor="topic-max">Max. Vergaben</Label>
              <Input id="topic-max" type="number" min="1" max="999" value={form.maxAssignments} onChange={e => setForm(f => ({ ...f, maxAssignments: e.target.value }))} placeholder="unbegrenzt" className="mt-1 text-sm" />
            </div>
            <p className="text-xs text-gray-400 mt-5">Leer lassen = unbegrenzt. Studierende sehen das Thema als „Vergeben“, sobald das Limit erreicht ist.</p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90" style={{ backgroundColor: "#76B900" }}>
              {editingId ? "Speichern" : "Thema anlegen"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Abbrechen</button>
          </div>
        </form>
      )}
      {isLoading ? (
        <div className="text-sm text-gray-400">Lade Themen…</div>
      ) : topics.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">Noch keine Themenvorschläge angelegt.</div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic: any) => (
            <div key={topic.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${topic.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{topic.title}</span>
                    {topic.isActive ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span> : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inaktiv</span>}
                    {topic.degreeType && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{topic.degreeType === "bachelor" ? "Bachelor" : "Master"}</span>}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-600">{topic.language === "en" ? "Englisch" : topic.language === "both" ? "DE & EN" : "Deutsch"}</span>
                    {/* Einmalig-Badge: nur wenn noch nicht ausgebucht */}
                    {topic.allowMultiple === 0 && Number(topic.assignmentCount) < 1 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600 font-medium">Einmalig</span>
                    )}
                    {/* Ausgebucht-Badge: allowMultiple=0 und bereits vergeben */}
                    {topic.allowMultiple === 0 && Number(topic.assignmentCount) >= 1 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-semibold">Ausgebucht</span>
                    )}
                    {/* Vergabe-Zähler für allowMultiple=0 ohne maxAssignments */}
                    {topic.allowMultiple === 0 && topic.maxAssignments == null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${Number(topic.assignmentCount) >= 1 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {Number(topic.assignmentCount)}/1 vergeben
                      </span>
                    )}
                    {/* Vergabe-Zähler für maxAssignments */}
                    {topic.maxAssignments != null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ Number(topic.assignmentCount) >= Number(topic.maxAssignments) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600' }`}>
                        {Number(topic.assignmentCount)}/{topic.maxAssignments} vergeben
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{topic.description}</p>
                  {topic.tags && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {topic.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string, i: number) => {
                        const colors = ['bg-violet-100 text-violet-700','bg-sky-100 text-sky-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-indigo-100 text-indigo-700'];
                        return <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[i % colors.length]}`}>{tag}</span>;
                      })}
                    </div>
                  )}
                  {(topic.validFromSemester || topic.validUntilSemester) && (
                    <p className="text-xs text-gray-400 mt-1">Gültig: {semesterLabel(topic.validFromSemester) ?? "ab sofort"} – {semesterLabel(topic.validUntilSemester) ?? "unbegrenzt"}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => toggleActiveMutation.mutate({ id: topic.id, isActive: topic.isActive ? 0 : 1 })} className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">{topic.isActive ? "Deaktivieren" : "Aktivieren"}</button>
                  <button type="button" onClick={() => startEdit(topic)} className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">Bearbeiten</button>
                  <button type="button" onClick={() => setDeleteConfirmId(topic.id)} className="px-2.5 py-1 rounded-lg text-xs border border-red-200 text-red-600 hover:bg-red-50">Löschen</button>
                </div>
              </div>

              {/* Ausgebucht: Limit erhöhen + Studierende anzeigen */}
              {(() => {
                const isBooked =
                  (topic.allowMultiple === 0 && Number(topic.assignmentCount) >= 1) ||
                  (topic.maxAssignments != null && Number(topic.assignmentCount) >= Number(topic.maxAssignments));
                if (!isBooked) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-red-100">
                    {/* Limit erhöhen */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-red-700">Thema ausgebucht — Limit erhöhen?</span>
                      {increaseLimitTopicId === topic.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={Number(topic.assignmentCount) + 1}
                            max={999}
                            value={newLimitValue}
                            onChange={e => setNewLimitValue(e.target.value)}
                            placeholder={`Neues Limit (min. ${Number(topic.assignmentCount) + 1})`}
                            className="h-7 text-xs w-44"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseInt(newLimitValue, 10);
                              if (!val || val <= Number(topic.assignmentCount)) {
                                toast.error(`Bitte einen Wert größer als ${topic.assignmentCount} eingeben.`);
                                return;
                              }
                              increaseTopicLimitMutation.mutate({ topicId: topic.id, newMaxAssignments: val });
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 font-medium"
                          >
                            Speichern
                          </button>
                          <button type="button" onClick={() => { setIncreaseLimitTopicId(null); setNewLimitValue(""); }} className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">Abbrechen</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setIncreaseLimitTopicId(topic.id); setNewLimitValue(""); }}
                          className="px-2.5 py-1 rounded-lg text-xs border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium"
                        >
                          + Limit erhöhen
                        </button>
                      )}
                    </div>

                    {/* Vergebene Studierende */}
                    <TopicStudentsList topicId={topic.id} />
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thema löschen?</AlertDialogTitle>
            <AlertDialogDescription>Dieser Vorgang kann nicht rückgängig gemacht werden. Das Thema wird dauerhaft entfernt.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })} className="bg-red-600 hover:bg-red-700 text-white">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────────
export default function ExaminerDashboard() {
  const [location, navigate] = useLocation();
  // URL-basierte Tab-Initialisierung: /examiner/profile öffnet direkt den Profil-Tab
  const getInitialTab = (): "overview" | "requests" | "colloquiums" | "history" | "profile" | "capacities" | "topics" => {
    if (location === "/examiner/profile") return "profile";
    if (location === "/examiner/requests") return "requests";
    if (location === "/examiner/colloquiums") return "colloquiums";
    if (location === "/examiner/history") return "history";
    if (location === "/examiner/capacities") return "capacities";
    if (location === "/examiner/topics") return "topics";
    if (location === "/examiner/programmes") return "profile";
    if (location === "/examiner/commission") return "profile";
    return "overview";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();

  // Role-Guard: Nur Prüfer:innen (Erst- und Zweitprüfer:innen) und Superadmins dürfen hier rein
  useEffect(() => {
    if (user && !hasRole("examiner") && !hasRole("second_examiner") && !hasRole("superadmin")) {
      navigate("/");
    }
  }, [user, navigate]);

  // Weiterleitung zum Onboarding-Assistenten wenn onboardingCompleted noch nicht gesetzt ist
  // (nur für echte Prüfer:innen, nicht für Superadmins)
  const { data: profile, isLoading: profileLoading } = trpc.examiner.myProfile.useQuery();
  useEffect(() => {
    // Nur weiterleiten wenn:
    // 1. Nutzer:in ist Prüfer:in (nicht Superadmin)
    // 2. Profil ist vollständig geladen (nicht loading)
    // 3. Profil-Daten sind vorhanden (nicht undefined) – verhindert Race Condition nach Onboarding
    // 4. onboardingCompleted ist explizit NICHT 1
    if ((hasRole("examiner") || hasRole("second_examiner")) && !profileLoading && profile !== undefined) {
      const completed = (profile as { onboardingCompleted?: number } | null | undefined)?.onboardingCompleted === 1;
      if (!completed) navigate("/examiner/onboarding");
    }
  }, [profile, profileLoading, navigate, user?.role]);

  const navItems = useNavItems();
  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/examiner") setActiveTab("overview");
      else if (item.href === "/examiner/requests") setActiveTab("requests");
      else if (item.href === "/examiner/colloquiums") setActiveTab("colloquiums");
      else if (item.href === "/examiner/history") setActiveTab("history");
      else if (item.href === "/examiner/profile") setActiveTab("profile");
      else if (item.href === "/examiner/capacities") setActiveTab("capacities");
      else if (item.href === "/examiner/topics") setActiveTab("topics");
    },
  }));

  const titles: Record<string, string> = {
    overview: t.examiner.title,
    requests: t.examiner.requests,
    colloquiums: t.examiner.colloquiums,
    history: t.examiner.history,
    profile: t.examiner.profile,
    capacities: t.supervisionCapacitiesPage.title,
    topics: "Meine Themenvorschläge",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <RequestsView />}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <ExaminerStatusHistory />}
      {activeTab === "profile" && <Profile embedded={true} />}
      {activeTab === "capacities" && <SupervisionCapacities />}
      {activeTab === "topics" && <ExaminerTopicsManager />}
    </ThesisDashboardLayout>
  );
}
