import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "Ausstehend", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ACCEPTED: { label: "Angenommen", cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED: { label: "Abgelehnt",  cls: "bg-red-50 text-red-700 border-red-200" },
  MATCHED:  { label: "Zugeteilt",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DeanDashboard() {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: requests, isLoading } = trpc.dean.getAllRequests.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#006937] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowedRoles = ["dean", "vice_dean", "admin", "superadmin"];
  if (!user || !allowedRoles.includes(user.role ?? "")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sie haben keinen Zugriff auf diesen Bereich.</p>
          <Link href="/" className="text-[#006937] hover:underline text-sm">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const roleLabel = user.role === "dean" ? "Dekan:in" : user.role === "vice_dean" ? "Prodekan:in" : "Admin";

  const filtered = (requests ?? []).filter(({ request, student }) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      request.title.toLowerCase().includes(q) ||
      (student.name ?? "").toLowerCase().includes(q) ||
      request.department.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || request.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: (requests ?? []).length,
    pending: (requests ?? []).filter((r) => r.request.status === "PENDING").length,
    matched: (requests ?? []).filter((r) => r.request.status === "MATCHED").length,
    accepted: (requests ?? []).filter((r) => r.request.status === "ACCEPTED").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Dekanat – Übersicht</h1>
              <p className="text-xs text-gray-500">Lesezugriff auf alle Abschlussarbeiten-Anträge</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Gesamt", value: stats.total, cls: "text-gray-900" },
            { label: "Ausstehend", value: stats.pending, cls: "text-yellow-700" },
            { label: "Angenommen", value: stats.accepted, cls: "text-green-700" },
            { label: "Zugeteilt", value: stats.matched, cls: "text-blue-700" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titel, Studierende:r, Studiengang…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">Alle Status</option>
            <option value="PENDING">Ausstehend</option>
            <option value="ACCEPTED">Angenommen</option>
            <option value="MATCHED">Zugeteilt</option>
            <option value="REJECTED">Abgelehnt</option>
          </select>
          <span className="self-center text-sm text-gray-400">{filtered.length} Einträge</span>
        </div>

        {/* Tabelle */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Keine Anträge gefunden.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Thema</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Studierende:r</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Studiengang</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Abschluss</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Eingereicht</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(({ request, student }) => {
                    const s = STATUS_MAP[request.status] ?? { label: request.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                    return (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 max-w-[260px]">
                          <p className="font-medium text-gray-900 truncate">{request.title}</p>
                          {(request as { hasOwnTopic?: number }).hasOwnTopic === 0 && (
                            <span className="text-xs text-gray-400">Kein eigenes Thema</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{student.name ?? "–"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{request.department}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs capitalize">{request.degreeType}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(request.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
