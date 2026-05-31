import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { ExaminerProgrammeSelector } from "@/components/ProgrammeSelector";
import { trpc } from "@/lib/trpc";
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
    { href: "/examiner/programmes", label: "Studiengänge", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  ];
  // Kommissionspräferenzen nur für Erstprüfer:innen (role=examiner)
  if (isFirstExaminer) {
    items.push({ href: "/examiner/commission", label: "Kommissionspräferenzen", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> });
  }
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

function RequestCard({ req }: { req: { id: number; title: string; description: string; department: string; status: string; targetSemester?: string | null; language?: string | null; degreeType?: string | null; exposéUrl?: string | null } }) {
  const { t } = useLanguage();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const utils = trpc.useUtils();

  const examinerRespond = trpc.thesis.examinerRespond.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "accept" ? t.examiner.toastAccepted ?? "Anfrage angenommen!" : t.examiner.toastRejected ?? "Anfrage abgelehnt.");
      utils.thesis.examinerRequests.invalidate();
      setShowRejectForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

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
          {showRejectForm ? (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ablehnungsgrund (optional)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => examinerRespond.mutate({ id: req.id, action: "reject", rejectionReason })}
                  disabled={examinerRespond.isPending}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Ablehnen bestätigen
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => examinerRespond.mutate({ id: req.id, action: "accept" })}
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
                onClick={() => setShowRejectForm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Ablehnen
              </button>
            </div>
          )}
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
function ProfileEdit() {
  const { t } = useLanguage();
  const { data: profile, isLoading } = trpc.examiner.myProfile.useQuery();
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
      tags: (profile.tags ?? []).join(", "),
      languages: (profile.languages ?? []).join(", "),
      studyPrograms: (profile.studyPrograms ?? []).join(", "),
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSecondExaminer ? "bg-green-600" : "bg-gray-200"}`}
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
          { label: t.examiner.statsAccepted ?? "Angenommen", value: stats.accepted, color: "text-green-600" },
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
              col.status === "COMPLETED" ? "bg-green-50 text-green-700" :
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
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Willkommen</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Profil einrichten</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bitte beantworten Sie kurz zwei Fragen, damit das System Ihnen die richtigen Anfragen zuordnen kann.
          </p>
        </div>

        {/* Progress */}
        <div className="px-8 pb-2">
          <div className="flex gap-2">
            <div className="h-1 flex-1 rounded-full bg-green-500" />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === "email" ? "bg-green-500" : "bg-gray-200"}`} />
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
                    ? "border-green-500 bg-green-50 text-green-700"
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
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
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
        {candidate.photoUrl ? (
          <img src={candidate.photoUrl} alt={candidate.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
            {(candidate.name ?? "").charAt(0).toUpperCase()}
          </div>
        )}
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
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 group-hover:bg-[#76B900]/20">
        {(candidate.name ?? "").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
        {candidate.title && <p className="text-xs text-gray-400 truncate">{candidate.title}</p>}
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
      <div className="w-8 h-8 rounded-full bg-[#76B900]/20 flex items-center justify-center text-xs font-bold text-[#76B900] flex-shrink-0">
        {(candidate.name ?? "").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
        {candidate.title && <p className="text-xs text-gray-400 truncate">{candidate.title}</p>}
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

// ─── Commission Preferences ────────────────────────────────────────────────────
function CommissionPreferences() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading: prefsLoading } = trpc.thesisPhase27.getCommissionPreferences.useQuery();
  const { data: allCandidates = [], isLoading: candidatesLoading } = trpc.thesisPhase27.getAllSecondExaminerCandidates.useQuery();

  // Ausgewählte IDs in Reihenfolge (rechte Liste)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Aktives Drag-Element
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ob ein Element gerade über die rechte Drop-Zone schwebt
  const [overRight, setOverRight] = useState(false);

  // Präferenzen beim Laden initialisieren
  useEffect(() => {
    if (prefs) setSelectedIds(prefs as number[]);
  }, [prefs]);

  const setMutation = trpc.thesisPhase27.setCommissionPreferences.useMutation({
    onSuccess: () => {
      toast.success("Kommissionspräferenzen gespeichert.");
      utils.thesisPhase27.getCommissionPreferences.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setSaving(false),
  });

  // Kandidaten-Maps
  const candidateMap = new Map((allCandidates as any[]).map((c: any) => [c.id, c]));
  const available = (allCandidates as any[])
    .filter((c: any) => !selectedIds.includes(c.id))
    .filter((c: any) => !searchQuery || (c.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()));
  // Reihenfolge der rechten Liste entspricht selectedIds
  const selected = selectedIds.map((id) => candidateMap.get(id)).filter(Boolean) as any[];

  const addToSelected = (id: number) => setSelectedIds((prev) => [...prev, id]);
  const removeFromSelected = (id: number) => setSelectedIds((prev) => prev.filter((x) => x !== id));

  const handleSave = () => {
    setSaving(true);
    setMutation.mutate({ secondExaminerIds: selectedIds });
  };

  // DnD-Sensoren: 8px Bewegung nötig, damit Klick nicht als Drag gilt
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // IDs für SortableContext
  const availableIds = available.map((c: any) => `available-${c.id}`);
  const selectedSortableIds = selectedIds.map((id) => `selected-${id}`);

  // Drop-Zone für rechte Liste (wenn leer)
  const { setNodeRef: setRightDropRef, isOver: isOverRight } = useDroppable({ id: "selected-zone" });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) { setOverRight(false); return; }
    const overId = String(over.id);
    setOverRight(overId === "selected-zone" || overId.startsWith("selected-"));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverRight(false);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeData = active.data.current as any;
    const overData = over.data.current as any;

    // Fall 1: Element aus linker Liste → rechte Liste (oder Drop-Zone)
    if (activeData?.type === "available") {
      const candidateId = activeData.candidateId as number;
      if (overIdStr === "selected-zone" || overData?.type === "selected") {
        // Einfügen an der richtigen Position
        if (overData?.type === "selected") {
          const overCandidateId = overData.candidateId as number;
          const overIndex = selectedIds.indexOf(overCandidateId);
          setSelectedIds((prev) => {
            const next = prev.filter((x) => x !== candidateId);
            next.splice(overIndex, 0, candidateId);
            return next;
          });
        } else {
          addToSelected(candidateId);
        }
      }
      return;
    }

    // Fall 2: Element aus rechter Liste → linke Liste
    if (activeData?.type === "selected" && overData?.type === "available") {
      removeFromSelected(activeData.candidateId);
      return;
    }

    // Fall 3: Umsortierung innerhalb der rechten Liste
    if (activeData?.type === "selected" && overData?.type === "selected") {
      const oldIndex = selectedIds.indexOf(activeData.candidateId);
      const newIndex = selectedIds.indexOf(overData.candidateId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setSelectedIds((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  }

  // Aktives Drag-Element für Overlay
  const activeCandidateId = activeId
    ? parseInt(activeId.replace("available-", "").replace("selected-", ""), 10)
    : null;
  const activeCandidate = activeCandidateId ? candidateMap.get(activeCandidateId) : null;
  const activeType = activeId?.startsWith("available-") ? "available" : "selected";

  if (prefsLoading || candidatesLoading) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Kommissionspräferenzen</h2>
        <p className="text-sm text-gray-500 mt-1">
          Wählen Sie die Zweitgutachter:innen aus, mit denen Sie bevorzugt zusammenarbeiten möchten.
          Ziehen Sie Personen zwischen den Listen oder klicken Sie auf einen Eintrag.
          Die Reihenfolge in der rechten Liste gibt Ihre Präferenz an.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          {/* Linke Liste: Verfügbare Zweitgutachter:innen */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Verfügbare Zweitgutachter:innen</h3>
              <p className="text-xs text-gray-400 mt-0.5">{available.length} Person{available.length !== 1 ? "en" : ""}</p>
              <div className="mt-2 relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#76B900]/50 focus:border-[#76B900]/50"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {available.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">Alle Kandidat:innen wurden ausgewählt.</div>
              ) : (
                <SortableContext items={availableIds} strategy={verticalListSortingStrategy}>
                  {available.map((c: any) => (
                    <AvailableItem key={c.id} candidate={c} onAdd={addToSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>

          {/* Mittel-Indikator */}
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 text-center">Ziehen oder<br/>Klicken</span>
          </div>

          {/* Rechte Liste: Bevorzugte Zweitgutachter:innen */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${
            isOverRight || overRight
              ? "border-[#76B900] bg-[#76B900]/10 shadow-[0_0_0_3px_rgba(118,185,0,0.15)]"
              : "border-[#76B900]/30 bg-[#76B900]/5"
          }`}>
            <div className="px-4 py-3 border-b border-[#76B900]/20 bg-[#76B900]/10">
              <h3 className="text-xs font-semibold text-[#76B900] uppercase tracking-widest">Meine bevorzugten Zweitgutachter:innen</h3>
              <p className="text-xs text-[#76B900]/70 mt-0.5">{selected.length} Person{selected.length !== 1 ? "en" : ""} ausgewählt · Reihenfolge = Präferenz</p>
            </div>
            <div className="max-h-80 overflow-y-auto" ref={setRightDropRef}>
              {selected.length === 0 ? (
                <SelectedDropZone isOver={isOverRight || overRight} />
              ) : (
                <SortableContext items={selectedSortableIds} strategy={verticalListSortingStrategy}>
                  {selected.map((c: any, idx: number) => (
                    <SelectedItem key={c.id} candidate={c} index={idx} onRemove={removeFromSelected} />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
        </div>

        {/* Drag-Overlay: schwebendes Element beim Ziehen */}
        <DragOverlay>
          {activeCandidate ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              activeType === "available"
                ? "bg-white border-gray-200"
                : "bg-[#76B900]/10 border-[#76B900]/40"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                activeType === "available" ? "bg-gray-100 text-gray-500" : "bg-[#76B900]/20 text-[#76B900]"
              }`}>
                {(activeCandidate.name ?? "").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{activeCandidate.name}</p>
                {activeCandidate.title && <p className="text-xs text-gray-400 truncate">{activeCandidate.title}</p>}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Speichern-Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {selected.length === 0
            ? "Ohne Präferenzen stehen alle Zweitgutachter:innen für Studierende zur Verfügung."
            : `${selected.length} bevorzugte Zweitgutachter:in${selected.length !== 1 ? "nen" : ""} ausgewählt.`}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#76B900" }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Speichern...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Präferenzen speichern</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────────
export default function ExaminerDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "colloquiums" | "history" | "profile" | "programmes" | "commission">("overview");
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Role-Guard: Nur Prüfer:innen (Erst- und Zweitprüfer:innen) und Superadmins dürfen hier rein
  useEffect(() => {
    if (user && user.role !== "examiner" && user.role !== "second_examiner" && user.role !== "superadmin") {
      navigate("/");
    }
  }, [user, navigate]);

  // Weiterleitung zum Onboarding-Assistenten wenn onboardingCompleted noch nicht gesetzt ist
  // (nur für echte Prüfer:innen, nicht für Superadmins)
  const { data: profile, isLoading: profileLoading } = trpc.examiner.myProfile.useQuery();
  useEffect(() => {
    if ((user?.role === "examiner" || user?.role === "second_examiner") && !profileLoading) {
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
      else if (item.href === "/examiner/programmes") setActiveTab("programmes");
      else if (item.href === "/examiner/commission") setActiveTab("commission");
    },
  }));

  const titles: Record<string, string> = {
    overview: t.examiner.title,
    requests: t.examiner.requests,
    colloquiums: t.examiner.colloquiums,
    history: t.examiner.history,
    profile: t.examiner.profile,
    programmes: t.examiner.programmes ?? "Studiengänge",
    commission: "Kommissionspräferenzen",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <RequestsView />}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <ExaminerStatusHistory />}
      {activeTab === "profile" && <ProfileEdit />}
      {activeTab === "programmes" && <ProgrammeSettings />}
      {activeTab === "commission" && <CommissionPreferences />}
    </ThesisDashboardLayout>
  );
}
