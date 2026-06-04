import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import Profile from "@/pages/Profile";
import { ExaminerProgrammeSelector } from "@/components/ProgrammeSelector";
import { trpc } from "@/lib/trpc";
import { UserAvatar } from "@/components/UserAvatar";
import { WorkloadBadge } from "@/components/WorkloadBadge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
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
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  inbox: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

const Icons2 = {
  calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  history: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};
function useNavItems() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isFirstExaminer = user?.role === "examiner" || user?.role === "admin" || user?.role === "superadmin";
  const items = [
    { href: "/examiner", label: t.examiner.title.replace("-Dashboard", "") || "Übersicht", icon: Icons.home },
    { href: "/examiner/requests", label: t.examiner.requests, icon: Icons.inbox },
    { href: "/examiner/colloquiums", label: t.examiner.colloquiums, icon: Icons2.calendar },
    { href: "/examiner/history", label: t.examiner.history, icon: Icons2.history },
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

function RequestCard({ req }: { req: { id: number; title: string; description: string; department: string; status: string; targetSemester?: string | null; language?: string | null; degreeType?: string | null; exposéUrl?: string | null; studentName?: string | null; studentEmail?: string | null } }) {
  const { t } = useLanguage();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{ action: "accept" | "reject" | "fully_booked"; subject: string; body: string } | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendEmailAfter, setSendEmailAfter] = useState(true);
  const utils = trpc.useUtils();

  const examinerRespond = trpc.thesis.examinerRespond.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "accept" ? t.examiner.toastAccepted ?? "Anfrage angenommen!" : t.examiner.toastRejected ?? "Anfrage abgelehnt.");
      utils.thesis.examinerRequests.invalidate();
      setShowRejectForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendResponseEmail = trpc.examinerEmailTemplates.sendResponse.useMutation({
    onError: (err) => toast.error("E-Mail konnte nicht gesendet werden: " + err.message),
  });

  // Template für Aktion laden und Dialog öffnen
  const { data: examinerTemplates } = trpc.examinerEmailTemplates.getAll.useQuery();

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

  const isPending = req.status === "PENDING";

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{req.department}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{req.description}</p>
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

      {isPending && (
        <div className="space-y-3">
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
              Annehmen
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
                  rows={7}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Ihr persönlicher Text an die/den Studierenden..."
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
function RequestsView() {
  const { data: requests, isLoading } = trpc.thesis.examinerRequests.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-semibold mb-1">Keine offenen Anfragen</h3>
        <p className="text-gray-500 text-sm">Sobald Studierende eine Anfrage stellen, erscheint sie hier.</p>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const others = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
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
  for (let i = 0; i < 4; i++) {
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
  const { data: savedCapacities = [] } = trpc.examiner.getSemesterCapacities.useQuery();
  const upsertCapacity = trpc.examiner.upsertSemesterCapacity.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const upcomingSemesters = generateUpcomingSemesters();
  const [capacities, setCapacities] = useState<SemesterCapacity[]>([]);
  const [capacitiesInitialized, setCapacitiesInitialized] = useState(false);

  useEffect(() => {
    if (capacitiesInitialized) return;
    if (isLoading) return;
    const merged = upcomingSemesters.map((sem) => {
      const saved = (savedCapacities as SemesterCapacity[]).find((c) => c.semester === sem);
      return { semester: sem, maxFirst: saved?.maxFirst ?? 0, maxSecond: saved?.maxSecond ?? 0 };
    });
    setCapacities(merged);
    setCapacitiesInitialized(true);
  }, [savedCapacities, isLoading, capacitiesInitialized]);

  const handleSaveCapacities = async () => {
    for (const cap of capacities) {
      await upsertCapacity.mutateAsync({ semester: cap.semester, maxFirst: cap.maxFirst, maxSecond: cap.maxSecond });
    }
    toast.success("Kapazitäten gespeichert!");
  };

  const [form, setForm] = useState({
    title: "",
    department: "",
    bio: "",
    tags: "",
    languages: "",
    studyPrograms: "",
    maxSupervisions: 5,
  });
  const [alternativeEmail, setAlternativeEmail] = useState("");
  const [isSecondExaminer, setIsSecondExaminer] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setForm({
      title: profile.title ?? "",
      department: profile.department ?? "",
      bio: profile.bio ?? "",
      tags: (Array.isArray(profile.tags) ? profile.tags : []).join(", "),
      languages: (Array.isArray(profile.languages) ? profile.languages : []).join(", "),
      studyPrograms: (Array.isArray(profile.studyPrograms) ? profile.studyPrograms : []).join(", "),
      maxSupervisions: profile.maxSupervisions ?? 5,
    });
    setAlternativeEmail((profile as { alternativeEmail?: string | null }).alternativeEmail ?? "");
    setIsSecondExaminer((profile as { isSecondExaminer?: number }).isSecondExaminer === 1);
    setInitialized(true);
  }

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
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      studyPrograms: form.studyPrograms.split(",").map((s) => s.trim()).filter(Boolean),
      maxSupervisions: form.maxSupervisions,
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fachbereich</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="z.B. Informatik und Wirtschaft"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kurzbiografie</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Forschungsschwerpunkte, Betreuungspräferenzen..."
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
          <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            <span>Semester</span>
            <span className="text-center">Max. Erstbetreuungen</span>
            <span className="text-center">Max. Zweitbetreuungen</span>
          </div>

          {capacities.map((cap, idx) => (
            <div key={cap.semester} className="grid grid-cols-3 gap-3 items-center bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-gray-800">{semesterLabel(cap.semester)}</span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxFirst: Math.max(0, c.maxFirst - 1) } : c))}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >−</button>
                <span className="w-8 text-center text-sm font-semibold text-gray-900">{cap.maxFirst}</span>
                <button
                  type="button"
                  onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxFirst: Math.min(50, c.maxFirst + 1) } : c))}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >+</button>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxSecond: Math.max(0, c.maxSecond - 1) } : c))}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >−</button>
                <span className="w-8 text-center text-sm font-semibold text-gray-900">{cap.maxSecond}</span>
                <button
                  type="button"
                  onClick={() => setCapacities((cs) => cs.map((c, i) => i === idx ? { ...c, maxSecond: Math.min(50, c.maxSecond + 1) } : c))}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >+</button>
              </div>
            </div>
          ))}
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

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const { t } = useLanguage();
  const { data: requests } = trpc.thesis.examinerRequests.useQuery();
  const stats = {
    total: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === "PENDING").length ?? 0,
    accepted: requests?.filter((r) => r.status === "ACCEPTED").length ?? 0,
    matched: requests?.filter((r) => r.status === "MATCHED").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.examiner.statsTotal ?? "Gesamt", value: stats.total, color: "text-gray-900" },
          { label: t.examiner.statsOpen ?? "Offen", value: stats.pending, color: "text-amber-600" },
          { label: t.examiner.statsAccepted ?? "Angenommen", value: stats.accepted, color: "text-primary" },
          { label: t.examiner.statsMatched ?? "Matched", value: stats.matched, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Neueste Anfragen</h2>
        {!requests?.length ? (
          <p className="text-sm text-gray-500">Noch keine Anfragen vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 5).map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                  <p className="text-xs text-gray-500">{req.department}</p>
                </div>
                <StatusBadge status={req.status} />
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Abschlussarbeit auswählen</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-md px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="">-- Bitte wählen --</option>
          {assignments.map((r: { id: number; title: string }) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>
      {selectedId && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5">Verlauf</h3>
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
        <UserAvatar name={candidate.name} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{candidate.name}</p>
          {candidate.title && <p className="text-xs text-gray-500 truncate">{candidate.title}</p>}
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
      <UserAvatar name={candidate.name} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
        {candidate.title && <p className="text-xs text-gray-400 truncate">{candidate.title}</p>}
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
      <UserAvatar name={candidate.name} email={candidate.email} avatarUrl={candidate.photoUrl ?? candidate.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
        {candidate.title && <p className="text-xs text-gray-400 truncate">{candidate.title}</p>}
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

// ─── Main Component ────────────────────────────────────────────────────────────────
export default function ExaminerDashboard() {
  const [location, navigate] = useLocation();
  // URL-basierte Tab-Initialisierung: /examiner/profile öffnet direkt den Profil-Tab
  const getInitialTab = (): "overview" | "requests" | "colloquiums" | "history" | "profile" => {
    if (location === "/examiner/profile") return "profile";
    if (location === "/examiner/requests") return "requests";
    if (location === "/examiner/colloquiums") return "colloquiums";
    if (location === "/examiner/history") return "history";
    if (location === "/examiner/programmes") return "profile"; // Weiterleitung: Studiengänge jetzt in Mein Profil
    if (location === "/examiner/commission") return "profile"; // Kommissionspräferenzen jetzt in Mein Profil
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
    if ((hasRole("examiner") || hasRole("second_examiner")) && !profileLoading) {
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

    },
  }));

  const titles: Record<string, string> = {
    overview: t.examiner.title,
    requests: t.examiner.requests,
    colloquiums: t.examiner.colloquiums,
    history: t.examiner.history,
    profile: t.examiner.profile,
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <RequestsView />}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <ExaminerStatusHistory />}
      {activeTab === "profile" && <Profile embedded={true} />}
    </ThesisDashboardLayout>
  );
}
