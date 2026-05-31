import { StatusBadge, ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import RoleApprovalTab from "@/components/RoleApprovalTab";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  list: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  log: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
};

const IconSettings = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconStats = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconCalendar = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

function useNavItems() {
  const { t } = useLanguage();
  return [
    { href: "/admin/role-approvals", label: "Rollenanfragen", icon: Icons.users },
    { href: "/admin", label: t.admin.overview, icon: Icons.home },
    { href: "/admin/requests", label: t.admin.requests, icon: Icons.list },
    { href: "/admin/audit", label: t.admin.audit, icon: Icons.log },
    { href: "/admin/users", label: t.admin.users, icon: Icons.users },
    { href: "/admin/settings", label: t.admin.settings, icon: IconSettings },
    { href: "/admin/stats", label: t.admin.stats, icon: IconStats },
    { href: "/admin/colloquiums", label: t.admin.colloquiums, icon: IconCalendar },
    { href: "/admin/email-templates", label: "E-Mail-Vorlagen", icon: Icons.list },
  ];
}

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
                style={slot === s ? { backgroundColor: "#76B900" } : undefined}
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
                style={selectedExaminer === user.id ? { backgroundColor: "#76B900" } : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    selectedExaminer === user.id ? "bg-white/20 text-white" : "text-white"
                  }`}
                  style={selectedExaminer !== user.id ? { backgroundColor: "#76B900" } : undefined}
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
            style={{ backgroundColor: "#76B900" }}
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

// ─── Deadline Modal ──────────────────────────────────────────────────────────
function DeadlineModal({
  thesisId, thesisTitle, currentDeadline, onClose,
}: { thesisId: number; thesisTitle: string; currentDeadline?: Date | string | null; onClose: () => void; }) {
  const utils = trpc.useUtils();
  const [dateValue, setDateValue] = useState(
    currentDeadline ? new Date(currentDeadline).toISOString().split("T")[0] : ""
  );
  const setDeadlineMutation = trpc.admin.setDeadline.useMutation({
    onSuccess: () => { toast.success("Deadline gespeichert!"); utils.thesis.all.invalidate(); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">Deadline setzen</h3>
        <p className="text-sm text-gray-500 mb-5 truncate">{thesisTitle}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Abgabedatum</label>
        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none mb-5" />
        <div className="flex gap-3">
          <button onClick={() => setDeadlineMutation.mutate({ thesisId, deadline: dateValue || null })}
            disabled={setDeadlineMutation.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}>
            {setDeadlineMutation.isPending ? "Speichern..." : "Deadline speichern"}
          </button>
          {currentDeadline && (
            <button onClick={() => setDeadlineMutation.mutate({ thesisId, deadline: null })}
              disabled={setDeadlineMutation.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50">
              Entfernen
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Abbrechen</button>
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
  const [deadlineModal, setDeadlineModal] = useState<{ id: number; title: string; deadline?: Date | string | null } | null>(null);
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
              style={filter === s ? { backgroundColor: "#76B900" } : undefined}
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
                        <button
                          onClick={() => setDeadlineModal({ id: req.id, title: req.title, deadline: req.deadline })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          title={req.deadline ? `Deadline: ${new Date(req.deadline).toLocaleDateString("de-DE")}` : "Deadline setzen"}
                        >
                          {req.deadline ? "📅" : "Deadline"}
                        </button>
                        {req.deadline && (
                          <a
                            href={`/api/thesis/${req.id}/deadline.ics`}
                            download
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            title="Kalender-Export (.ics)"
                          >
                            .ics
                          </a>
                        )}
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
      {deadlineModal && (
        <DeadlineModal
          thesisId={deadlineModal.id}
          thesisTitle={deadlineModal.title}
          currentDeadline={deadlineModal.deadline}
          onClose={() => setDeadlineModal(null)}
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
    FIRST_EXAMINER_ASSIGNED: "bg-primary/10 text-primary",
    SECOND_EXAMINER_ASSIGNED: "bg-primary/10 text-primary",
    EXAMINER_ACCEPTED: "bg-primary/10 text-primary",
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
            style={{ backgroundColor: "#76B900" }}
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
// ─── Rollenwechsel-Warnungen ──────────────────────────────────────────────────────────────────────────────────
const ROLE_CHANGE_WARNINGS: Record<string, Record<string, string>> = {
  examiner: {
    student: "Diese Person ist als Prüfer:in registriert und hat möglicherweise offene Betreuungsanfragen. Ein Rollenwechsel zu Studierende:r entfernt den Prüfer:innen-Zugang.",
    pav: "Diese Person ist als Prüfer:in registriert. Ein Wechsel zur PAV-Rolle entfernt den Prüfer:innen-Zugang. Offene Anfragen bleiben bestehen.",
    user: "Diese Person ist als Prüfer:in registriert. Ein Wechsel zur Nutzer:in-Rolle entfernt alle Prüfer:innen-Rechte.",
  },
  pav: {
    examiner: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Prüfer:in-Rolle entfernt alle PAV-Rechte und Studiengang-Zuweisungen.",
    student: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Studierenden-Rolle entfernt alle PAV-Rechte.",
    user: "Diese Person ist PA-Vorsitzende:r. Ein Wechsel zur Nutzer:in-Rolle entfernt alle PAV-Rechte und Studiengang-Zuweisungen.",
  },
  admin: {
    user: "Diese Person ist Admin. Ein Wechsel zur Nutzer:in-Rolle entfernt alle Administrationsrechte.",
    student: "Diese Person ist Admin. Ein Wechsel zur Studierenden-Rolle entfernt alle Administrationsrechte.",
    examiner: "Diese Person ist Admin. Ein Wechsel zur Prüfer:in-Rolle entfernt alle Administrationsrechte.",
  },
  dean: {
    user: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    student: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    examiner: "Diese Person ist Dekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
  },
  vice_dean: {
    user: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    student: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
    examiner: "Diese Person ist Prodekan:in. Ein Rollenwechsel entfernt den Lesezugriff auf alle Anträge.",
  },
};

const ROLE_LABELS: Record<string, string> = {
  user: "Nutzer:in", student: "Studierende:r", examiner: "Prüfer:in (Erstprüfer:in)",
  second_examiner: "Zweitprüfer:in",
  pav: "PA-Vorsitzende:r", dean: "Dekan:in", vice_dean: "Prodekan:in",
  admin: "Admin", superadmin: "Superadmin",
};

function RoleChangeConfirmDialog({
  userName, fromRole, toRole, onConfirm, onCancel,
}: { userName: string; fromRole: string; toRole: string; onConfirm: () => void; onCancel: () => void; }) {
  const warning = ROLE_CHANGE_WARNINGS[fromRole]?.[toRole];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Rolle ändern?</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <strong>{userName}</strong>: {ROLE_LABELS[fromRole] ?? fromRole} → {ROLE_LABELS[toRole] ?? toRole}
            </p>
          </div>
        </div>
        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
        <p className="text-sm text-gray-600 mb-5">Möchten Sie die Rolle wirklich ändern? Diese Aktion kann rückgängig gemacht werden.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-colors" style={{ backgroundColor: "#76B900" }}>
            Rolle ändern
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────────────────────────────
function UserManagement() {
  const { data: users, isLoading } = trpc.admin.users.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: number; userName: string; fromRole: string; toRole: string } | null>(null);

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle aktualisiert!");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetOnboarding = trpc.adminExtra.resetExaminerOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Onboarding zurückgesetzt – Prüfer:in wird beim nächsten Login erneut befragt.");
      utils.admin.users.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setSecondFlag = trpc.examiner.setSecondExaminerFlag.useMutation({
    onSuccess: () => {
      toast.success("Zweitprüfer:in-Flag aktualisiert!");
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
    second_examiner: "Zweitprüfer:in",
    admin: "Admin",
    user: "Nutzer:in",
    pav: "PA-Vorsitzende:r",
    dean: "Dekan:in",
    vice_dean: "Prodekan:in",
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {showCreate && <CreateExaminerModal onClose={() => setShowCreate(false)} />}
      {pendingRoleChange && (
        <RoleChangeConfirmDialog
          userName={pendingRoleChange.userName}
          fromRole={pendingRoleChange.fromRole}
          toRole={pendingRoleChange.toRole}
          onConfirm={() => {
            updateRole.mutate({ userId: pendingRoleChange.userId, role: pendingRoleChange.toRole as "student" | "examiner" | "second_examiner" | "admin" | "user" | "pav" | "dean" | "vice_dean" });
            setPendingRoleChange(null);
          }}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
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
                      {user.role === "examiner" && (
                        <button
                          type="button"
                          title="Onboarding zurücksetzen (Prüfer:in wird beim nächsten Login erneut befragt)"
                          onClick={() => resetOnboarding.mutate({ userId: user.id })}
                          className="px-2 py-1 rounded-lg text-xs font-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                        >
                          Onboarding ↺
                        </button>
                      )}
                      {user.role === "examiner" && (
                        <button
                          type="button"
                          title={(profile as { isSecondExaminer?: number } | undefined)?.isSecondExaminer === 1 ? "Zweitprüfer:in (klicken zum Deaktivieren)" : "Erstprüfer:in (klicken für Zweitprüfer:in)"}
                          onClick={() => setSecondFlag.mutate({ isSecondExaminer: !((profile as { isSecondExaminer?: number } | undefined)?.isSecondExaminer === 1), userId: user.id })}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            (profile as { isSecondExaminer?: number } | undefined)?.isSecondExaminer === 1
                              ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {(profile as { isSecondExaminer?: number } | undefined)?.isSecondExaminer === 1 ? "2º Prüfer:in" : "1º Prüfer:in"}
                        </button>
                      )}
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          if (newRole === user.role) return;
                          // Warnung nötig?
                          const needsWarning = !!ROLE_CHANGE_WARNINGS[user.role]?.[newRole];
                          if (needsWarning) {
                            setPendingRoleChange({ userId: user.id, userName: user.name ?? user.email ?? "?", fromRole: user.role, toRole: newRole });
                          } else {
                            updateRole.mutate({ userId: user.id, role: newRole as "student" | "examiner" | "second_examiner" | "admin" | "user" | "pav" | "dean" | "vice_dean" });
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="user">Nutzer:in</option>
                        <option value="student">Studierende:r</option>
                        <option value="examiner">Prüfer:in (Erstprüfer:in)</option>
                        <option value="second_examiner">Zweitprüfer:in</option>
                        <option value="pav">PA-Vorsitzende:r</option>
                        <option value="dean">Dekan:in</option>
                        <option value="vice_dean">Prodekan:in</option>
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
  const { data: pendingRoles, refetch: refetchPending } = trpc.roleApproval.getPending.useQuery();
  const { data: thesisStats } = trpc.admin.stats.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.roleApproval.approve.useMutation({
    onSuccess: () => { toast.success("Nutzer:in wurde freigeschaltet."); refetchPending(); utils.admin.users.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.roleApproval.reject.useMutation({
    onSuccess: () => { toast.success("Registrierung wurde abgelehnt."); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });

  // KPI-Berechnungen
  const total = requests?.length ?? 0;
  const pending = requests?.filter((r) => r.status === "PENDING").length ?? 0;
  const matched = requests?.filter((r) => r.status === "MATCHED").length ?? 0;
  const approved = requests?.filter((r) => r.status === "FIRST_EXAMINER_ACCEPTED" || r.status === "PENDING_SECOND_EXAMINER").length ?? 0;
  const completed = requests?.filter((r) => r.status === "COMPLETED").length ?? 0;
  const rejected = requests?.filter((r) => r.status === "REJECTED").length ?? 0;
  const pendingRoleCount = (pendingRoles ?? []).filter(u => u.roleStatus === "pending").length;
  const totalUsers = users?.length ?? 0;
  const studentCount = users?.filter(u => u.user.role === "student").length ?? 0;
  const examinerCount = users?.filter(u => u.user.role === "examiner").length ?? 0;

  // Statusverteilung für Balkendiagramm
  const statusData = [
    { name: "Ausstehend", value: pending, color: "#f59e0b" },
    { name: "Matched", value: matched, color: "#3b82f6" },
    { name: "Genehmigt", value: approved, color: "#76B900" },
    { name: "Abgeschlossen", value: completed, color: "#8b5cf6" },
    { name: "Abgelehnt", value: rejected, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Letzte 6 Monate für Trendlinie
  const monthData = (thesisStats?.byMonth ?? []).slice(-6);

  return (
    <div className="space-y-6">
      {/* Hauptkennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Anfragen gesamt", value: total, sub: `${pending} ausstehend`, color: "#76B900", bg: "bg-[#76B900]/5" },
          { label: "Aktive Nutzer:innen", value: totalUsers, sub: `${studentCount} Stud. · ${examinerCount} Prüf.`, color: "#3b82f6", bg: "bg-blue-50" },
          { label: "Rollenanfragen offen", value: pendingRoleCount, sub: "Warten auf Bestätigung", color: pendingRoleCount > 0 ? "#f59e0b" : "#6b7280", bg: pendingRoleCount > 0 ? "bg-amber-50" : "bg-gray-50" },
          { label: "Abgeschlossen", value: completed, sub: `${approved} genehmigt`, color: "#8b5cf6", bg: "bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white shadow-sm`}>
            <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm font-medium text-gray-700">{stat.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Fortschrittsbalken: Bearbeitungsstand */}
      {total > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Bearbeitungsstand aller Anfragen</h2>
          <div className="space-y-3">
            {[
              { label: "Ausstehend", value: pending, color: "bg-amber-400" },
              { label: "Matched", value: matched, color: "bg-blue-500" },
              { label: "Genehmigt", value: approved, color: "bg-[#76B900]" },
              { label: "Abgeschlossen", value: completed, color: "bg-purple-500" },
              { label: "Abgelehnt", value: rejected, color: "bg-red-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-28 text-xs text-gray-600 shrink-0">{item.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${item.color}`}
                    style={{ width: `${Math.round((item.value / total) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-500 text-right shrink-0">
                  {item.value} ({Math.round((item.value / total) * 100)} %)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Statusverteilung als Balkendiagramm */}
        {statusData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Statusverteilung</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Anfragen" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trendlinie: Anfragen pro Monat */}
        {monthData.length > 1 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Anfragen pro Monat</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Anfragen" stroke="#76B900" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Offene Rollenanfragen */}
        {pendingRoleCount > 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Offene Rollenanfragen
            </h2>
            <p className="text-sm text-gray-500 mb-4">{pendingRoleCount} Nutzer:in warten auf Bestätigung ihrer Rolle.</p>
            <div className="space-y-2">
              {(pendingRoles ?? []).filter(u => u.roleStatus === "pending").slice(0, 10).map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-100 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap shrink-0">
                    {u.requestedRole === "student" ? "Studierende:r" : u.requestedRole === "examiner" ? "Prüfer:in" : "Verwaltung"}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ userId: u.id })}
                      disabled={approveMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#76b900] text-white font-medium hover:bg-[#5a8c00] transition-colors disabled:opacity-50"
                    >
                      Freischalten
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt("Begründung (optional):") ?? undefined;
                        rejectMutation.mutate({ userId: u.id, reason });
                      }}
                      disabled={rejectMutation.isPending}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Neueste Anfragen */}
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

        {/* Aktivitäts-Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
          {!logs?.length ? (
            <p className="text-sm text-gray-500">Noch keine Aktivitäten.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {logs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex gap-4 pl-8 relative">
                    <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-[#76B900]/20 border-2 border-[#76B900] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-500">Anfrage #{log.thesisRequestId} · {new Date(log.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// // ─── Settings (SMTP-Test) ─────────────────────────────────────────────────────
function SettingsView() {
  const [testEmail, setTestEmail] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const testSmtp = trpc.system2.testSmtp.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => setResult({ success: false, message: err.message }),
  });
  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">SMTP-Verbindungstest</h2>
        <p className="text-sm text-gray-500 mb-5">
          Senden Sie eine Test-E-Mail, um zu prüfen, ob der SMTP-Server korrekt konfiguriert ist.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@htw-berlin.de"
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
          />
          <button
            onClick={() => { setResult(null); testSmtp.mutate({ email: testEmail }); }}
            disabled={!testEmail || testSmtp.isPending}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#76B900" }}
          >
            {testSmtp.isPending ? "Wird gesendet..." : "Test senden"}
          </button>
        </div>
        {result && (
          <div className={`mt-4 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
            result.success ? "bg-primary/5 text-primary border border-primary/15" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {result.success ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            {result.message}
          </div>
        )}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Konfigurierte Variablen</p>
          <div className="space-y-1.5">
            {["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_FROM"].map((key) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-mono text-gray-600">{key}</span>
                <span className="text-xs text-gray-400">in Geheimnissen gespeichert</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Statistics ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  ACCEPTED: "#76B900",
  MATCHED: "#0082D1",
  REJECTED: "#EF4444",
};
function StatisticsView() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" /></div>;
  if (!stats) return <p className="text-sm text-gray-400 text-center py-8">Keine Statistikdaten verfügbar.</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.byStatus.map((s) => (
          <div key={s.name} className="rounded-2xl p-5 border border-gray-100 bg-white shadow-sm">
            <div className="text-3xl font-bold" style={{ color: STATUS_COLORS[s.name] ?? "#76B900" }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{s.name}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {stats.byStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#76B900"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Fachbereich</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byDepartment} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#76B900" radius={[4, 4, 0, 0]} name="Anfragen" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {stats.byMonth.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen pro Monat</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#76B900" strokeWidth={2} dot={{ r: 4 }} name="Anfragen" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Zugriffskontrolle: Nur Admins und Superadmins
  if (user && user.role !== "admin" && user.role !== "superadmin") {
    setLocation("/");
    return null;
  }
  
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "audit" | "users" | "stats" | "settings" | "role_approvals" | "email_templates">("overview");
  const navItems = useNavItems();
  const currentNavItems = navItems.map((item) => ({
    ...item,
    onClick: () => {
      if (item.href === "/admin/role-approvals") setActiveTab("role_approvals");
      else if (item.href === "/admin") setActiveTab("overview");
      else if (item.href === "/admin/requests") setActiveTab("requests");
      else if (item.href === "/admin/audit") setActiveTab("audit");
      else if (item.href === "/admin/users") setActiveTab("users");
      else if (item.href === "/admin/stats") setActiveTab("stats");
      else if (item.href === "/admin/settings") setActiveTab("settings");
      else if (item.href === "/admin/email-templates") setActiveTab("email_templates");
    },
  }));
  const titles: Record<string, string> = {
    role_approvals: "Rollenanfragen",
    overview: "Verwaltungs-Dashboard",
    requests: "Alle Anfragen",
    audit: "Audit-Log",
    users: "Nutzerverwaltung",
    stats: "Statistiken",
    settings: "Einstellungen",
    email_templates: "E-Mail-Vorlagen",
  };
  return (
    <ThesisDashboardLayout navItems={currentNavItems} title={titles[activeTab]}>
      {activeTab === "role_approvals" && <RoleApprovalTab canApproveAll={false} />}
      {activeTab === "overview" && <Overview />}
      {activeTab === "requests" && <AllRequests />}
      {activeTab === "audit" && <AuditLogView />}
      {activeTab === "users" && <UserManagement />}
      {activeTab === "stats" && <StatisticsView />}
      {activeTab === "settings" && <SettingsView />}
      {activeTab === "email_templates" && <EmailTemplatesTab />}
    </ThesisDashboardLayout>
  );
}
