import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { ExaminerProgrammeSelector } from "@/components/ProgrammeSelector";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
  return [
    { href: "/examiner", label: t.examiner.title.replace("-Dashboard", "") || "Übersicht", icon: Icons.home },
    { href: "/examiner/requests", label: t.examiner.requests, icon: Icons.inbox },
    { href: "/examiner/colloquiums", label: t.examiner.colloquiums, icon: Icons2.calendar },
    { href: "/examiner/history", label: t.examiner.history, icon: Icons2.history },
    { href: "/examiner/profile", label: t.examiner.profile, icon: Icons.profile },
    { href: "/examiner/programmes", label: "Studiengänge", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  ];
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
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const utils = trpc.useUtils();

  const examinerRespond = trpc.thesis.examinerRespond.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.action === "accept" ? "Anfrage angenommen!" : "Anfrage abgelehnt.");
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
        {req.language && <span>🌐 {req.language === "de" ? "Deutsch" : "Englisch"}</span>}
        {req.degreeType && <span>🎓 {req.degreeType === "bachelor" ? "Bachelor" : "Master"}</span>}
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
    setInitialized(true);
  }

  const updateProfile = trpc.examiner.updateProfile.useMutation({
    onSuccess: () => toast.success("Profil gespeichert!"),
    onError: (err) => toast.error(err.message),
  });

  const setAltEmail = trpc.examiner.setAlternativeEmail.useMutation({
    onSuccess: () => toast.success("Alternative E-Mail gespeichert!"),
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

          {/* Alternative E-Mail für Zweitprüfer:innen */}
          <div className="border-t border-gray-100 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternative E-Mail-Adresse
              <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Als Zweitprüfer:in können Sie hier eine alternative E-Mail-Adresse hinterlegen, über die Sie kontaktiert werden möchten (z. B. eine externe oder persönliche Adresse).
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
            disabled={updateProfile.isPending || setAltEmail.isPending}
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
          { label: "Gesamt", value: stats.total, color: "text-gray-900" },
          { label: "Offen", value: stats.pending, color: "text-amber-600" },
          { label: "Angenommen", value: stats.accepted, color: "text-green-600" },
          { label: "Matched", value: stats.matched, color: "text-blue-600" },
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
            }`}>{col.status === "SCHEDULED" ? "Geplant" : col.status === "COMPLETED" ? "Abgeschlossen" : "Abgesagt"}</span>
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
    THESIS_CREATED: "Anfrage eingereicht",
    STATUS_CHANGED: "Status geändert",
    EXAMINER_ACCEPTED: "Prüfer:in hat angenommen",
    EXAMINER_REJECTED: "Prüfer:in hat abgelehnt",
    FIRST_EXAMINER_ASSIGNED: "Erstprüfer:in zugewiesen",
    SECOND_EXAMINER_ASSIGNED: "Zweitprüfer:in zugewiesen",
    COLLOQUIUM_CREATED: "Kolloquium angelegt",
    DEADLINE_SET: "Abgabefrist gesetzt",
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
// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExaminerDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "colloquiums" | "history" | "profile" | "programmes">("overview");

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
    },
  }));

  const titles: Record<string, string> = {
    overview: "Prüfer:innen-Dashboard",
    requests: "Betreuungsanfragen",
    colloquiums: "Meine Kolloquien",
    history: "Statushistorie",
    profile: "Mein Profil",
    programmes: "Prüfungsstudiengänge",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <RequestsView />}
      {activeTab === "colloquiums" && <MyColloquiums />}
      {activeTab === "history" && <ExaminerStatusHistory />}
      {activeTab === "profile" && <ProfileEdit />}
      {activeTab === "programmes" && <ProgrammeSettings />}
    </ThesisDashboardLayout>
  );
}
