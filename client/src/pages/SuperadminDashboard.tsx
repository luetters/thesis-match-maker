import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ThesisDashboardLayout } from "@/components/ThesisDashboardLayout";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

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

// ─── Systemstatistiken ────────────────────────────────────────────────────────

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

  const statCards = [
    { label: "Nutzer:innen gesamt", value: users?.length ?? 0, icon: "👥" },
    { label: "Superadmins", value: roleCount["superadmin"] ?? 0, icon: "🔑" },
    { label: "Admins / Verwaltung", value: roleCount["admin"] ?? 0, icon: "🛡️" },
    { label: "Prüfer:innen", value: roleCount["examiner"] ?? 0, icon: "🎓" },
    { label: "Studierende", value: roleCount["student"] ?? 0, icon: "📚" },
    { label: "Abschlussarbeiten gesamt", value: (stats?.byStatus?.reduce((a: number, s: any) => a + (s.value ?? s.count ?? 0), 0) ?? 0), icon: "📄" },
    { label: "Ausstehende Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "PENDING")?.value ?? 0, icon: "⏳" },
    { label: "Angenommene Anfragen", value: (stats?.byStatus as any[])?.find((s) => s.name === "ACCEPTED")?.value ?? 0, icon: "✅" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
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
    await updateSettings.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

const TABS = [
  { id: "stats", label: "Systemstatistiken", icon: "📊" },
  { id: "users", label: "Nutzer:innen & Rollen", icon: "👥" },
  { id: "audit", label: "Audit-Log", icon: "📋" },
  { id: "config", label: "Systemkonfiguration", icon: "⚙️" },
];

const navItems = [
  { label: "Superadmin", href: "/superadmin", icon: "🔑" },
  { label: "Admin-Dashboard", href: "/admin", icon: "🛡️" },
  { label: "Startseite", href: "/", icon: "🏠" },
];

export default function SuperadminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("stats");

  if (loading) return null;
  if (!isAuthenticated || (user?.role !== "superadmin")) {
    if (!loading) navigate("/");
    return null;
  }

  return (
    <ThesisDashboardLayout navItems={navItems} title="Superadmin-Bereich">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔑</span>
          <h1 className="text-2xl font-bold text-gray-900">Superadmin-Bereich</h1>
        </div>
        <p className="text-sm text-gray-500">
          Exklusiver Bereich für <strong>{user?.name ?? user?.email}</strong> – vollständige Systemverwaltung.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {activeTab === "stats" && <SystemStatsTab />}
      {activeTab === "users" && <UserManagementTab />}
      {activeTab === "audit" && <AuditLogTab />}
      {activeTab === "config" && <SystemConfigTab />}
    </ThesisDashboardLayout>
  );
}
