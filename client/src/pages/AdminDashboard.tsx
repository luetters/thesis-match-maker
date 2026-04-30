import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  list: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  log: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
};

const navItems = [
  { href: "/admin", label: "Übersicht", icon: Icons.home },
  { href: "/admin/requests", label: "Alle Anfragen", icon: Icons.list },
  { href: "/admin/audit", label: "Audit-Log", icon: Icons.log },
  { href: "/admin/users", label: "Nutzerverwaltung", icon: Icons.users },
];

// ─── Assign Examiner Modal ────────────────────────────────────────────────────
function AssignExaminerModal({
  thesisId,
  thesisTitle,
  onClose,
}: {
  thesisId: number;
  thesisTitle: string;
  onClose: () => void;
}) {
  const { data: examiners } = trpc.examiner.list.useQuery();
  const [selectedExaminer, setSelectedExaminer] = useState<number | null>(null);
  const [slot, setSlot] = useState<"first" | "second">("first");
  const utils = trpc.useUtils();

  const assignMutation = trpc.thesis.assignExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in erfolgreich zugewiesen!");
      utils.thesis.all.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Prüfer:in zuweisen</h3>
        <p className="text-sm text-gray-500 mb-5 truncate">{thesisTitle}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Slot</label>
          <div className="grid grid-cols-2 gap-2">
            {(["first", "second"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  slot === s ? "border-transparent text-white" : "border-gray-200 text-gray-600"
                }`}
                style={slot === s ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
              >
                {s === "first" ? "Erstprüfer:in" : "Zweitprüfer:in"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prüfer:in auswählen</label>
          <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2">
            {examiners?.map(({ user, profile }) => (
              <button
                key={user.id}
                onClick={() => setSelectedExaminer(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selectedExaminer === user.id ? "text-white" : "hover:bg-gray-50"
                }`}
                style={selectedExaminer === user.id ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    selectedExaminer === user.id ? "bg-white/20 text-white" : "text-white"
                  }`}
                  style={selectedExaminer !== user.id ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
                >
                  {(user.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${selectedExaminer === user.id ? "text-white" : "text-gray-900"}`}>
                    {profile?.title ? `${profile.title} ` : ""}{user.name}
                  </div>
                  {profile?.department && (
                    <div className={`text-xs truncate ${selectedExaminer === user.id ? "text-white/70" : "text-gray-500"}`}>
                      {profile.department}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {!examiners?.length && (
              <p className="text-sm text-gray-500 text-center py-4">Keine Prüfer:innen gefunden.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (!selectedExaminer) { toast.error("Bitte Prüfer:in auswählen"); return; }
              assignMutation.mutate({ thesisId, examinerId: selectedExaminer, slot });
            }}
            disabled={assignMutation.isPending || !selectedExaminer}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            {assignMutation.isPending ? "Wird zugewiesen..." : "Zuweisen"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── All Requests ─────────────────────────────────────────────────────────────
function AllRequests() {
  const { data: requests, isLoading } = trpc.thesis.all.useQuery();
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED">("ALL");
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState<{ id: number; title: string } | null>(null);
  const utils = trpc.useUtils();

  const updateStatus = trpc.thesis.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status aktualisiert!");
      utils.thesis.all.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = requests?.filter((r) => {
    const matchFilter = filter === "ALL" || r.status === filter;
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Suche nach Titel, Fachbereich..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "ACCEPTED", "REJECTED", "MATCHED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === s ? "text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={filter === s ? { backgroundColor: "oklch(38.5% 0.12 152)" } : undefined}
            >
              {s === "ALL" ? "Alle" : s === "PENDING" ? "Ausstehend" : s === "ACCEPTED" ? "Angenommen" : s === "REJECTED" ? "Abgelehnt" : "Matched"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!filtered?.length ? (
          <div className="text-center py-12 text-gray-500 text-sm">Keine Anfragen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Titel</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Fachbereich</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 text-sm truncate max-w-xs">{req.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 md:hidden">{req.department}</div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{req.department}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setAssignModal({ id: req.id, title: req.title })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Prüfer:in
                        </button>
                        <select
                          value={req.status}
                          onChange={(e) =>
                            updateStatus.mutate({
                              id: req.id,
                              status: e.target.value as "PENDING" | "ACCEPTED" | "REJECTED" | "MATCHED",
                            })
                          }
                          className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="PENDING">Ausstehend</option>
                          <option value="ACCEPTED">Angenommen</option>
                          <option value="REJECTED">Abgelehnt</option>
                          <option value="MATCHED">Matched</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignModal && (
        <AssignExaminerModal
          thesisId={assignModal.id}
          thesisTitle={assignModal.title}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLogView() {
  const { data: logs, isLoading } = trpc.auditLog.all.useQuery();

  const actionLabels: Record<string, string> = {
    THESIS_CREATED: "Anfrage erstellt",
    STATUS_CHANGED: "Status geändert",
    FIRST_EXAMINER_ASSIGNED: "Erstprüfer:in zugewiesen",
    SECOND_EXAMINER_ASSIGNED: "Zweitprüfer:in zugewiesen",
    EXAMINER_ACCEPTED: "Prüfer:in angenommen",
    EXAMINER_REJECTED: "Prüfer:in abgelehnt",
  };

  const actionColors: Record<string, string> = {
    THESIS_CREATED: "bg-blue-100 text-blue-700",
    STATUS_CHANGED: "bg-amber-100 text-amber-700",
    FIRST_EXAMINER_ASSIGNED: "bg-green-100 text-green-700",
    SECOND_EXAMINER_ASSIGNED: "bg-green-100 text-green-700",
    EXAMINER_ACCEPTED: "bg-green-100 text-green-700",
    EXAMINER_REJECTED: "bg-red-100 text-red-700",
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-semibold mb-1">Keine Einträge</h3>
        <p className="text-gray-500 text-sm">Alle Statusänderungen werden hier protokolliert.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Zeitpunkt</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Aktion</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Anfrage-ID</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Von → Nach</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Notiz</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                    {actionLabels[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className="text-xs text-gray-600 font-mono">#{log.thesisRequestId}</span>
                </td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  {log.fromStatus || log.toStatus ? (
                    <span className="text-xs text-gray-600">
                      {log.fromStatus && <StatusBadge status={log.fromStatus} />}
                      {log.fromStatus && log.toStatus && <span className="mx-1.5 text-gray-400">→</span>}
                      {log.toStatus && <StatusBadge status={log.toStatus} />}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  <span className="text-xs text-gray-500 line-clamp-1">{log.reason ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Create Examiner Modal ──────────────────────────────────────────────────────────────────
function CreateExaminerModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", email: "", title: "", department: "", bio: "", maxSupervisions: 5 });
  const createExaminer = trpc.admin.createExaminer.useMutation({
    onSuccess: () => {
      toast.success("Prüfer:in erfolgreich angelegt!");
      utils.admin.users.invalidate();
      utils.examiner.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });
  const sendInvite = trpc.admin.sendInvite.useMutation({
    onSuccess: () => toast.success("Einladungs-E-Mail gesendet!"),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Prüfer:in anlegen</h3>
        <p className="text-sm text-gray-500 mb-5">Neues Konto erstellen und optional Einladung senden</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Prof. Dr. Muster" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="muster@htw-berlin.de" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Prof. Dr." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fachbereich</label>
              <input value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} placeholder="FB 4 – Informatik" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kurzbiografie</label>
            <textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} placeholder="Forschungsschwerpunkte, Interessen ..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max. Betreuungen: {form.maxSupervisions}</label>
            <input type="range" min={1} max={20} value={form.maxSupervisions} onChange={(e) => setForm(f => ({ ...f, maxSupervisions: +e.target.value }))} className="w-full" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => createExaminer.mutate(form)}
            disabled={createExaminer.isPending || !form.name || !form.email}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
          >
            {createExaminer.isPending ? "Wird angelegt..." : "Anlegen"}
          </button>
          <button
            onClick={() => sendInvite.mutate({ email: form.email, role: "examiner", origin: window.location.origin })}
            disabled={sendInvite.isPending || !form.email}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Einladen
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────────────
function UserManagement() {
  const { data: users, isLoading } = trpc.admin.users.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle aktualisiert!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Nutzer:in gelöscht!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const roleLabels: Record<string, string> = {
    student: "Studierende:r",
    examiner: "Prüfer:in",
    admin: "Admin",
    user: "Nutzer:in",
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {showCreate && <CreateExaminerModal onClose={() => setShowCreate(false)} />}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{users?.length ?? 0} Nutzer:innen registriert</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Prüfer:in anlegen
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">E-Mail</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Rolle</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users?.map(({ user, profile }) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: "oklch(38.5% 0.12 152)" }}
                      >
                        {(user.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{user.name ?? "—"}</span>
                        {profile?.department && <div className="text-xs text-gray-400">{profile.department}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{user.email ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => updateRole.mutate({ userId: user.id, role: e.target.value as "student" | "examiner" | "admin" | "user" })}
                        className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="user">Nutzer:in</option>
                        <option value="student">Studierende:r</option>
                        <option value="examiner">Prüfer:in</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => {
                          if (confirm(`Nutzer:in "${user.name}" wirklich löschen?`)) {
                            deleteUser.mutate({ userId: user.id });
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview() {
  const { data: requests } = trpc.thesis.all.useQuery();
  const { data: users } = trpc.admin.users.useQuery();
  const { data: logs } = trpc.auditLog.all.useQuery();

  const stats = {
    total: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === "PENDING").length ?? 0,
    matched: requests?.filter((r) => r.status === "MATCHED").length ?? 0,
    users: users?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Anfragen gesamt", value: stats.total, color: "text-gray-900" },
          { label: "Ausstehend", value: stats.pending, color: "text-amber-600" },
          { label: "Matched", value: stats.matched, color: "text-blue-600" },
          { label: "Nutzer:innen", value: stats.users, color: "text-gray-900" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Neueste Anfragen</h2>
          {!requests?.length ? (
            <p className="text-sm text-gray-500">Noch keine Anfragen.</p>
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

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Letzte Audit-Einträge</h2>
          {!logs?.length ? (
            <p className="text-sm text-gray-500">Noch keine Log-Einträge.</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{log.action}</p>
                    <p className="text-xs text-gray-500">Anfrage #{log.thesisRequestId}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                    {new Date(log.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "audit" | "users">("overview");

  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/admin") setActiveTab("overview");
      else if (item.href === "/admin/requests") setActiveTab("requests");
      else if (item.href === "/admin/audit") setActiveTab("audit");
      else if (item.href === "/admin/users") setActiveTab("users");
    },
  }));

  const titles: Record<string, string> = {
    overview: "Verwaltungs-Dashboard",
    requests: "Alle Anfragen",
    audit: "Audit-Log",
    users: "Nutzerverwaltung",
  };

  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <AllRequests />}
      {activeTab === "audit" && <AuditLogView />}
      {activeTab === "users" && <UserManagement />}
    </ThesisDashboardLayout>
  );
}
