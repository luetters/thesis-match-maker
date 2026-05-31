import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Typen ────────────────────────────────────────────────────────────────────
type AdminRole = "admin" | "superadmin" | "dean" | "vice_dean" | "pav";

const ROLE_CONFIG: Record<AdminRole, { label: string; description: string; color: string; bg: string; border: string }> = {
  superadmin: {
    label: "Superadmin",
    description: "Vollständiger Systemzugriff, kann Admins verwalten",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  admin: {
    label: "Administrator:in",
    description: "Verwaltung von Anfragen, Nutzern und Einstellungen",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  dean: {
    label: "Dekan:in",
    description: "Leitungsfunktion mit erweitertem Lesezugriff",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  vice_dean: {
    label: "Prodekan:in",
    description: "Stellvertretende Leitungsfunktion",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  pav: {
    label: "PAV-Mitarbeiter:in",
    description: "Prüfungs- und Anmeldeverwaltung",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
};

const ALL_ROLES: AdminRole[] = ["superadmin", "admin", "dean", "vice_dean", "pav"];

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as AdminRole];
  if (!cfg) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{role}</span>;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function AdminManagementTab() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | AdminRole>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    userId: number;
    userName: string;
    currentRole: string;
    newRole: string;
  } | null>(null);

  // Alle Nutzer:innen laden
  const { data: allUsers, isLoading, refetch } = trpc.superadmin.listAllUsers.useQuery();

  // Rolle setzen
  const setRoleMutation = trpc.superadmin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle erfolgreich aktualisiert.");
      setConfirmDialog(null);
      refetch();
    },
    onError: (e) => {
      toast.error(`Fehler: ${e.message}`);
      setConfirmDialog(null);
    },
  });

  // Nur Admin-relevante Rollen anzeigen
  const adminUsers = (allUsers ?? []).filter((u) =>
    ALL_ROLES.includes(u.role as AdminRole)
  );

  // Alle anderen Nutzer:innen (für Beförderung)
  const nonAdminUsers = (allUsers ?? []).filter(
    (u) => !ALL_ROLES.includes(u.role as AdminRole)
  );

  // Gefilterte Admin-Liste
  const filteredAdmins = adminUsers.filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Nutzer:innen für Beförderung (Suche)
  const [promoteSearch, setPromoteSearch] = useState("");
  const filteredNonAdmins = nonAdminUsers.filter(
    (u) =>
      promoteSearch.length >= 2 &&
      (u.name?.toLowerCase().includes(promoteSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(promoteSearch.toLowerCase()))
  );

  const handleExportCSV = () => {
    const headers = ["ID", "Name", "E-Mail", "Rolle", "Rollenbezeichnung"];
    const rows = adminUsers.map((u) => [
      u.id,
      `"${(u.name ?? "").replace(/"/g, '""')}"`,
      `"${(u.email ?? "").replace(/"/g, '""')}"`,
      u.role,
      `"${(ROLE_CONFIG[u.role as AdminRole]?.label ?? u.role).replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HTW-Berlin_Administratoren_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${adminUsers.length} Einträge als CSV exportiert.`);
  };

  const handleRoleChange = (userId: number, userName: string, currentRole: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast.error("Sie können Ihre eigene Rolle nicht ändern.");
      return;
    }
    setConfirmDialog({ userId, userName, currentRole, newRole });
  };

  const confirmRoleChange = () => {
    if (!confirmDialog) return;
    setRoleMutation.mutate({
      userId: confirmDialog.userId,
      role: confirmDialog.newRole as any,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">🛡️</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Rechteverwaltung</h2>
          <p className="text-sm text-gray-500">Verwaltung von Administratoren und Berechtigungen</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={isLoading || adminUsers.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-50"
          title="Administratorenliste als CSV exportieren"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#76b900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV-Export
        </button>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_ROLES.map((role) => {
          const count = adminUsers.filter((u) => u.role === role).length;
          const cfg = ROLE_CONFIG[role];
          return (
            <div
              key={role}
              onClick={() => setFilterRole(filterRole === role ? "all" : role)}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                filterRole === role
                  ? `${cfg.bg} ${cfg.border} shadow-sm`
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className={`text-2xl font-bold ${filterRole === role ? cfg.color : "text-gray-900"}`}>
                {count}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Admin-Liste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Aktive Administratoren
            {filterRole !== "all" && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${ROLE_CONFIG[filterRole].bg} ${ROLE_CONFIG[filterRole].color}`}>
                {ROLE_CONFIG[filterRole].label}
              </span>
            )}
          </h3>
          <input
            type="text"
            placeholder="Name oder E-Mail suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900]"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Wird geladen…</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Keine Einträge gefunden.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">E-Mail</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Aktuelle Rolle</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Rolle ändern</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAdmins.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isSelf ? "bg-green-50/40" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[140px]">
                          {u.name ?? "–"}
                          {isSelf && <span className="ml-1 text-xs text-green-600">(Sie)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell truncate max-w-[180px]">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">Eigene Rolle</span>
                      ) : (
                        <select
                          defaultValue={u.role}
                          disabled={isSelf || setRoleMutation.isPending}
                          onChange={(e) => handleRoleChange(u.id, u.name ?? u.email ?? String(u.id), u.role, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] bg-white"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                          ))}
                          <option value="student">Studierende:r (entfernen)</option>
                          <option value="examiner">Prüfer:in (entfernen)</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() =>
                            handleRoleChange(u.id, u.name ?? u.email ?? String(u.id), u.role, "student")
                          }
                          disabled={setRoleMutation.isPending}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Entfernen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Nutzer:in befördern */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Nutzer:in zur Verwaltung hinzufügen</h3>
        <p className="text-sm text-gray-500 mb-4">
          Suchen Sie eine:n bestehende:n Nutzer:in und weisen Sie ihr/ihm eine Verwaltungsrolle zu.
        </p>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Name oder E-Mail eingeben (mind. 2 Zeichen)…"
            value={promoteSearch}
            onChange={(e) => setPromoteSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900]"
          />
        </div>

        {promoteSearch.length >= 2 && (
          <div className="space-y-2">
            {filteredNonAdmins.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Keine Nutzer:innen gefunden.</p>
            ) : (
              filteredNonAdmins.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name ?? "–"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={u.role} />
                    <select
                      defaultValue="admin"
                      id={`promote-role-${u.id}`}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#76b900]/30 focus:border-[#76b900] bg-white"
                    >
                      {ALL_ROLES.filter((r) => r !== "superadmin").map((r) => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById(`promote-role-${u.id}`) as HTMLSelectElement;
                        handleRoleChange(u.id, u.name ?? u.email ?? String(u.id), u.role, sel.value);
                      }}
                      disabled={setRoleMutation.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#76b900] text-white font-medium hover:bg-[#5a8c00] transition-colors disabled:opacity-50"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Rollenbeschreibungen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Rollenbeschreibungen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_ROLES.map((role) => {
            const cfg = ROLE_CONFIG[role];
            return (
              <div key={role} className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
                <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{cfg.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bestätigungs-Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⚠️</div>
              <h3 className="font-bold text-gray-900">Rolle ändern</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Soll die Rolle von <strong>{confirmDialog.userName}</strong> wirklich geändert werden?
            </p>
            <div className="flex items-center gap-2 mb-5 text-sm">
              <RoleBadge role={confirmDialog.currentRole} />
              <span className="text-gray-400">→</span>
              <RoleBadge role={confirmDialog.newRole} />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={setRoleMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-[#76b900] text-white font-medium hover:bg-[#5a8c00] transition-colors disabled:opacity-50"
              >
                {setRoleMutation.isPending ? "Wird gespeichert…" : "Bestätigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
