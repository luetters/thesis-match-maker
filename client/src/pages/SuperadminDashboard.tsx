import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import RoleApprovalTab from "@/components/RoleApprovalTab";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";
import { EmailTemplatesTab } from "./EmailTemplatesTab";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin / Verwaltung",
  examiner: "Prüfer:in",
  student: "Studierende:r",
  user: "Nutzer:in",
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800 border border-purple-200",
  admin: "bg-blue-100 text-blue-800 border border-blue-200",
  examiner: "bg-green-100 text-green-800 border border-green-200",
  student: "bg-amber-100 text-amber-800 border border-amber-200",
  user: "bg-gray-100 text-gray-700 border border-gray-200",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Nutzer-Rollen-Verwaltung ─────────────────────────────────────────────────

function UserManagementTab() {
  const { data: users, isLoading, refetch } = trpc.admin.users.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => refetch() });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.user.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.user.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Suche nach Name oder E-Mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-white"
        >
          <option value="all">Alle Rollen</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktuelle Rolle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle ändern</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.user.name ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">{u.user.email ?? "–"}</td>
                <td className="px-4 py-3"><RoleBadge role={u.user.role} /></td>
                <td className="px-4 py-3">
                  <select
                    value={u.user.role}
                    onChange={(e) => updateRole.mutate({ userId: u.user.id, role: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 bg-white"
                  >
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Keine Nutzer:innen gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">{filtered.length} von {users?.length ?? 0} Nutzer:innen angezeigt</p>
    </div>
  );
}

// ─── Audit-Log-Export ─────────────────────────────────────────────────────────

function AuditLogTab() {
  const { data: logs, isLoading } = trpc.auditLog.all.useQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l: any) =>
        l.action?.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata ?? {}).toLowerCase().includes(q)
    );
  }, [logs, search]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = ["ID", "Aktion", "Akteur-ID", "Zeitstempel", "Details"];
    const rows = (filtered as any[]).map((l) => [
      l.id,
      l.action,
      l.actorId ?? "",
      new Date(l.createdAt).toLocaleString("de-DE"),
      JSON.stringify(l.metadata ?? {}),
    ]);
    const csv = [header, ...rows]
      .map((r: any[]) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Suche in Aktionen und Details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
        />
        <button
          onClick={exportCSV}
          disabled={!filtered.length}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "#76B900" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV exportieren ({filtered.length})
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zeitstempel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aktion</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Akteur-ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((l: any) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.actorId ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-xs truncate">
                    {JSON.stringify(l.metadata ?? {})}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Keine Einträge gefunden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
            Zeige 100 von {filtered.length} Einträgen. Exportieren Sie die CSV für alle Daten.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase 40: Nutzer-Details Modal ────────────────────────────────────────────────────────

function UserDetailsModal({ userId, onClose }: { userId?: number; onClose: () => void }) {
  const { data: user, isLoading, refetch } = trpc.superadmin.getUserDetails.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const setRoleMutation = trpc.superadmin.setUserRole.useMutation({
    onSuccess: () => {
      setIsEditingRole(false);
      setShowConfirm(false);
      toast.success("Rolle erfolgreich geändert.");
      setStatusMessage({ type: 'success', text: 'Rolle erfolgreich geändert' });
      setTimeout(() => setStatusMessage(null), 3000);
      refetch();
    },
    onError: (error) => {
      console.error("Fehler beim Aendern der Rolle:", error);
      toast.error("Fehler beim Ändern der Rolle: " + error.message);
      setStatusMessage({ type: 'error', text: 'Fehler beim Aendern der Rolle' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setShowConfirm(true);
  };

  const confirmRoleChange = async () => {
    if (userId && selectedRole) {
      await setRoleMutation.mutateAsync({
        userId,
        role: selectedRole as any,
      });
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nutzer-Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Lädt...</div>
        ) : user ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Name</label>
              <p className="text-gray-900">{user.name || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Rolle</label>
              {isEditingRole ? (
                <select
                  value={selectedRole || user.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="student">Studierende:r</option>
                  <option value="examiner">Pruefer:in</option>
                  <option value="pav">PAV</option>
                  <option value="admin">Admin</option>
                  <option value="dean">Dekan:in</option>
                  <option value="vice_dean">Vizedekan:in</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              ) : (
                <div className="flex items-center justify-between">
                  <RoleBadge role={user.role} />
                  <button
                    onClick={() => {
                      setIsEditingRole(true);
                      setSelectedRole(user.role);
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Aendern
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Registriert am</label>
              <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString("de-DE")}</p>
            </div>

            {statusMessage && (
              <div className={`mt-4 p-4 rounded-lg border ${
                statusMessage.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm ${
                  statusMessage.type === 'success'
                    ? 'text-green-900'
                    : 'text-red-900'
                }`}>
                  {statusMessage.text}
                </p>
              </div>
            )}

            {showConfirm && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-900 mb-3">
                  Moechten Sie die Rolle wirklich von <strong>{user.role}</strong> zu <strong>{selectedRole}</strong> aendern?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    disabled={setRoleMutation.isPending}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {setRoleMutation.isPending ? "Speichert..." : "Bestaetigen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Nutzer nicht gefunden</div>
        )}
      </div>
    </div>
  );
}

// ─── Phase 40: Nutzer-Verwaltungs-Dashboard ─────────────────────────────────────

function UserDashboardTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const pageSize = 20;
  // Debounced Suche (300ms Verzögerung)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  // Abrufe Statistiken
  const { data: stats, isLoading: statsLoading } = trpc.superadmin.getUserStatistics.useQuery();
  // Suche Nutzer
  const { data: searchResults, isLoading: searchLoading } = trpc.superadmin.searchUsers.useQuery(
    {
      query: debouncedSearchQuery,
      role: roleFilter || undefined,
      limit: pageSize,
      offset: currentPage * pageSize,
    },
    { enabled: debouncedSearchQuery.length > 0 || roleFilter.length > 0 }
  );
  // Abrufe alle Nutzer wenn keine Suche aktiv
  const { data: allUsers, isLoading: usersLoading } = trpc.superadmin.getAllUsers.useQuery(
    {
      limit: pageSize,
      offset: currentPage * pageSize,
    },
    { enabled: debouncedSearchQuery.length === 0 && roleFilter.length === 0 }
  );

  const users = searchResults || allUsers;
  const isLoading = searchLoading || usersLoading;

  // Berechne Statistik-Karten
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Gesamt Nutzer",
        value: stats.total || 0,
        icon: "👥",
        color: "bg-blue-50",
      },
      {
        label: "Studierende",
        value: stats.student || 0,
        icon: "📚",
        color: "bg-amber-50",
      },
      {
        label: "Prüfer:innen",
        value: stats.examiner || 0,
        icon: "🎓",
        color: "bg-green-50",
      },
      {
        label: "Admins",
        value: stats.admin || 0,
        icon: "🛡️",
        color: "bg-red-50",
      },
    ];
  }, [stats]);

  const handleViewDetails = (userId: number) => {
    setSelectedUser(userId);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
  };

  const totalPages = users?.total ? Math.ceil(users.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-2xl border border-gray-100 shadow-sm p-5`}>
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Suchbereich */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Nutzer verwalten</h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Email oder Name suchen…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Alle Rollen</option>
            <option value="student">Studierende</option>
            <option value="examiner">Prüfer:innen</option>
            <option value="pav">PAV</option>
            <option value="admin">Admin</option>
            <option value="dean">Dekan</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
      </div>

      {/* Nutzer-Tabelle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Alle Nutzer ({users?.total || 0})</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Lädt...</div>
        ) : users?.users && users.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Registriert</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.name || "-"}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewDetails(u.id)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Seite {currentPage + 1} von {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Zurück
                </button>
                <button
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">Keine Nutzer gefunden</div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && <UserDetailsModal userId={selectedUser} onClose={handleCloseModal} />}
    </div>
  );
}

// ─── Systemstatistiken ────────────────────────────────────────────────────────
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const ROLE_PIE_COLORS = ["#76B900", "#0082D1", "#FF5F00", "#AFAFAF", "#7C3AED", "#DB2777"];
const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: "#AFAFAF",
  ACCEPTED: "#76B900",
  REJECTED: "#FF5F00",
  COMPLETED: "#0082D1",
  CANCELLED: "#DB2777",
};
const STATUS_LABELS_MAP: Record<string, string> = {
  PENDING: "Ausstehend",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

function SystemStatsTab() {
  const { data: users } = trpc.admin.users.useQuery();
  const { data: stats } = trpc.admin.stats.useQuery();

  const roleCount = useMemo(() => {
    if (!users) return {};
    return users.reduce((acc: Record<string, number>, u) => {
      acc[u.user.role] = (acc[u.user.role] ?? 0) + 1;
      return acc;
    }, {});
  }, [users]);

  // Daten für Pie-Chart (Rollen-Verteilung)
  const rolePieData = useMemo(() => {
    return Object.entries(ROLE_LABELS)
      .map(([role, label]) => ({ name: label, value: roleCount[role] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [roleCount]);

  // Daten für Bar-Chart (Thesis-Status)
  const statusBarData = useMemo(() => {
    if (!stats?.byStatus) return [];
    return (stats.byStatus as any[]).map((s) => ({
      name: STATUS_LABELS_MAP[s.name] ?? s.name,
      Anzahl: s.value ?? s.count ?? 0,
      fill: STATUS_BAR_COLORS[s.name] ?? "#AFAFAF",
    }));
  }, [stats]);

  const statCards = [
    { label: "Nutzer:innen gesamt", value: users?.length ?? 0, icon: "\u{1F465}" },
    { label: "Superadmins", value: roleCount["superadmin"] ?? 0, icon: "\u{1F511}" },
    { label: "Admins / Verwaltung", value: roleCount["admin"] ?? 0, icon: "\u{1F6E1}\uFE0F" },
    { label: "Prüfer:innen", value: roleCount["examiner"] ?? 0, icon: "\u{1F393}" },
    { label: "Studierende", value: roleCount["student"] ?? 0, icon: "\u{1F4DA}" },
    { label: "Abschlussarbeiten gesamt", value: (stats?.byStatus?.reduce((a: number, s: any) => a + (s.value ?? s.count ?? 0), 0) ?? 0), icon: "\u{1F4C4}" },
    { label: "Ausstehende Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "PENDING")?.value ?? 0, icon: "\u23F3" },
    { label: "Angenommene Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "ACCEPTED")?.value ?? 0, icon: "\u2705" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts-Reihe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie-Chart: Rollen-Verteilung */}
        {rolePieData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Rollen-Verteilung</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={rolePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {rolePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ROLE_PIE_COLORS[index % ROLE_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} Nutzer:innen`, "Anzahl"]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legende */}
            <div className="flex flex-wrap gap-2 mt-3">
              {rolePieData.map((d, index) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: ROLE_PIE_COLORS[index % ROLE_PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar-Chart: Abschlussarbeiten nach Status */}
        {statusBarData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Abschlussarbeiten nach Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Anzahl" radius={[4, 4, 0, 0]}>
                  {statusBarData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {stats?.byDepartment && stats.byDepartment.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Anfragen nach Fachbereich</h3>
          <div className="space-y-3">
            {stats.byDepartment.map((d: any) => (
              <div key={d.name ?? d.department} className="flex items-center gap-3">
                <div className="text-sm text-gray-600 w-40 truncate">{(d.name ?? d.department) || "Nicht angegeben"}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, ((d.value ?? d.count ?? 0) / Math.max(...stats.byDepartment.map((x: any) => x.value ?? x.count ?? 1))) * 100)}%`,
                      backgroundColor: "#76B900",
                    }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900 w-8 text-right">{d.value ?? d.count ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────


// --- Systemkonfiguration ---

function SystemConfigTab() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.superadmin.getSettings.useQuery();
  const updateSettings = trpc.superadmin.updateSettings.useMutation({
    onSuccess: () => utils.superadmin.getSettings.invalidate(),
  });

  type FormState = {
    systemName: string;
    contactEmail: string;
    maintenanceMode: "true" | "false";
    maxSupervisionDefault: string;
    allowStudentRegistration: "true" | "false";
    footerText: string;
    thesisDeadlineWarningDays: string;
  };
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);

  // Formular mit Serverdaten befüllen (einmalig nach dem ersten Laden)
  useEffect(() => {
    if (settings && !form) {
      setForm({
        systemName: settings.systemName,
        contactEmail: settings.contactEmail,
        maintenanceMode: settings.maintenanceMode as "true" | "false",
        maxSupervisionDefault: settings.maxSupervisionDefault,
        allowStudentRegistration: settings.allowStudentRegistration as "true" | "false",
        footerText: settings.footerText,
        thesisDeadlineWarningDays: settings.thesisDeadlineWarningDays,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    try {
      await updateSettings.mutateAsync(form);
      setSaved(true);
      toast.success("Einstellungen erfolgreich gespeichert.");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error("Fehler beim Speichern: " + (err?.message ?? "Unbekannter Fehler"));
    }
  };

  if (isLoading || !form) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gray-300 border-t-green-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-base">Allgemeine Einstellungen</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Systemname</label>
          <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.systemName} onChange={(e) => setForm((f) => f ? { ...f, systemName: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kontakt-E-Mail</label>
          <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.contactEmail} onChange={(e) => setForm((f) => f ? { ...f, contactEmail: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fusszeilen-Text</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" rows={3} value={form.footerText} onChange={(e) => setForm((f) => f ? { ...f, footerText: e.target.value } : f)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-gray-900 text-base">Betrieb</h3>
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setForm((f) => f ? { ...f, maintenanceMode: f.maintenanceMode === "true" ? "false" : "true" } : f)} className={"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none " + (form.maintenanceMode === "true" ? "bg-green-600" : "bg-gray-200")}>
            <span className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 " + (form.maintenanceMode === "true" ? "translate-x-5" : "translate-x-0")} />
          </button>
          <div>
            <div className="text-sm font-medium text-gray-700">Wartungsmodus</div>
            <div className="text-xs text-gray-500">Wenn aktiv, ist das System fuer normale Nutzer:innen gesperrt.</div>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => setForm((f) => f ? { ...f, allowStudentRegistration: f.allowStudentRegistration === "true" ? "false" : "true" } : f)} className={"relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none " + (form.allowStudentRegistration === "true" ? "bg-green-600" : "bg-gray-200")}>
            <span className={"pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 " + (form.allowStudentRegistration === "true" ? "translate-x-5" : "translate-x-0")} />
          </button>
          <div>
            <div className="text-sm font-medium text-gray-700">Studierenden-Registrierung erlauben</div>
            <div className="text-xs text-gray-500">Wenn deaktiviert, koennen sich keine neuen Studierenden registrieren.</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-base">Schwellenwerte</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard-Betreuungskapazitaet (Pruefer:in)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.maxSupervisionDefault} onChange={(e) => setForm((f) => f ? { ...f, maxSupervisionDefault: e.target.value } : f)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline-Warnung (Tage vorher)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.thesisDeadlineWarningDays} onChange={(e) => setForm((f) => f ? { ...f, thesisDeadlineWarningDays: e.target.value } : f)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={updateSettings.isPending} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
          {updateSettings.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Gespeichert</span>}
        {updateSettings.isError && <span className="text-sm text-red-600">{updateSettings.error?.message}</span>}
      </div>
    </div>
  );
}

// --- PAV-Verwaltungs-Komponente ---
function PavManagementTab() {
  const { data: pavUsers, refetch } = trpc.superadmin.getPavUsers.useQuery();
  const { data: allProgrammes } = trpc.programmes.list.useQuery();
  const assignProg = trpc.superadmin.assignPavProgramme.useMutation({
    onSuccess: () => { refetch(); toast.success("Studiengang erfolgreich zugewiesen."); },
    onError: (err) => toast.error("Fehler beim Zuweisen: " + err.message),
  });
  const removeProg = trpc.superadmin.removePavProgramme.useMutation({
    onSuccess: () => { refetch(); toast.success("Studiengang erfolgreich entfernt."); },
    onError: (err) => toast.error("Fehler beim Entfernen: " + err.message),
  });

  if (!pavUsers || pavUsers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <p className="text-gray-400 text-sm">Keine PAV-Vorsitzenden vorhanden.</p>
        <p className="text-gray-400 text-xs mt-1">Weisen Sie Nutzer:innen zunaechst die Rolle "PAV" zu (Tab Nutzer:innen & Rollen).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Weisen Sie PA-Vorsitzenden Studiengaenge zu. PAV-Vorsitzende sehen im PAV-Dashboard nur Studierende ihrer zugeordneten Studiengaenge.
      </p>
      {(pavUsers ?? []).map(({ user: u, programmes: assigned }) => (
        <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="font-semibold text-gray-900">{u.name ?? u.email}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(allProgrammes ?? []).map((prog) => {
              const isAssigned = assigned.some((a) => a.programmeId === prog.id);
              return (
                <div
                  key={prog.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isAssigned ? "border-[#006937] bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{prog.name}</p>
                    <p className="text-xs text-gray-400">{prog.level === "master" ? "Master" : "Bachelor"} - {prog.abbreviation}</p>
                  </div>
                  <button
                    onClick={() =>
                      isAssigned
                        ? removeProg.mutate({ userId: u.id, programmeId: prog.id })
                        : assignProg.mutate({ userId: u.id, programmeId: prog.id })
                    }
                    disabled={assignProg.isPending || removeProg.isPending}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isAssigned
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-[#006937] text-white hover:bg-[#005a2f]"
                    } disabled:opacity-50`}
                  >
                    {isAssigned ? "Entfernen" : "Zuweisen"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// TABS werden dynamisch in der Komponente erzeugt (abhängig von t)

const navItems = [
  { label: "Superadmin", href: "/superadmin", icon: "🔑" },
  { label: "Admin-Dashboard", href: "/admin", icon: "🛡️" },
  { label: "Startseite", href: "/", icon: "🏠" },
];

export default function SuperadminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("stats");

  const TABS = [
    { id: "role_approvals", label: "Rollenanfragen", icon: "✅" },
    { id: "stats", label: t.superadmin.tabs.overview, icon: "📊" },
    { id: "users", label: t.superadmin.tabs.users, icon: "👥" },
    { id: "user_dashboard", label: "Nutzer-Verwaltung", icon: "👤" },
    { id: "examiners", label: t.superadmin.examinerManagement, icon: "🎓", action: () => setLocation("/superadmin/examiners") },
    { id: "pav", label: "PAV", icon: "🏫" },
    { id: "audit", label: "Audit-Log", icon: "📋" },
    { id: "config", label: t.superadmin.tabs.settings, icon: "⚙️" },
    { id: "email_templates", label: t.superadmin.tabs.emailTemplates, icon: "✉️" },
  ];

  if (loading) return null;
  if (!isAuthenticated || (user?.role !== "superadmin")) {
    if (!loading) navigate("/");
    return null;
  }

  return (
      <ThesisDashboardLayout navItems={navItems} title={t.superadmin.title}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔑</span>
          <h1 className="text-2xl font-bold text-gray-900">{t.superadmin.title}</h1>
        </div>
        <p className="text-sm text-gray-500">
          Exklusiver Bereich für <strong>{user?.name ?? user?.email}</strong> – vollständige Systemverwaltung.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.action) tab.action();
              else setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "role_approvals" && <RoleApprovalTab canApproveAll={true} />}
      {activeTab === "stats" && <SystemStatsTab />}
      {activeTab === "users" && <UserManagementTab />}
      {activeTab === "user_dashboard" && <UserDashboardTab />}
      {activeTab === "pav" && <PavManagementTab />}
      {activeTab === "audit" && <AuditLogTab />}
      {activeTab === "config" && <SystemConfigTab />}
      {activeTab === "email_templates" && <EmailTemplatesTab />}
    </ThesisDashboardLayout>
  );
}
