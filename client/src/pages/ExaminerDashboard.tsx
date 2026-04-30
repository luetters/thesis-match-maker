import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  inbox: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  profile: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

const navItems = [
  { href: "/examiner", label: "Übersicht", icon: Icons.home },
  { href: "/examiner/requests", label: "Anfragen", icon: Icons.inbox },
  { href: "/examiner/profile", label: "Mein Profil", icon: Icons.profile },
];

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ req }: { req: { id: number; title: string; description: string; department: string; status: string; targetSemester?: string | null; language?: string | null; degreeType?: string | null } }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
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
                style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
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
    setInitialized(true);
  }

  const updateProfile = trpc.examiner.updateProfile.useMutation({
    onSuccess: () => toast.success("Profil gespeichert!"),
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
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExaminerDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "profile">("overview");

  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/examiner") setActiveTab("overview");
      else if (item.href === "/examiner/requests") setActiveTab("requests");
      else if (item.href === "/examiner/profile") setActiveTab("profile");
    },
  }));

  const titles: Record<string, string> = {
    overview: "Prüfer:innen-Dashboard",
    requests: "Betreuungsanfragen",
    profile: "Mein Profil",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <RequestsView />}
      {activeTab === "profile" && <ProfileEdit />}
    </ThesisDashboardLayout>
  );
}
