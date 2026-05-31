import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Hilfsfunktionen ---
function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "Ausstehend", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  ACCEPTED: { label: "Angenommen", cls: "bg-primary/5 text-primary border-primary/20" },
  REJECTED: { label: "Abgelehnt",  cls: "bg-red-50 text-red-700 border-red-200" },
  MATCHED:  { label: "Zugeteilt",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

// --- Detailansicht-Seitenleiste ---
function RequestDetailSheet({
  requestId,
  onClose,
}: {
  requestId: number;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.dean.getRequestDetail.useQuery({ requestId });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Antragsdetails</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Antrag nicht gefunden.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Titel & Status */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {data.request.title || <span className="text-gray-400 italic">Kein Thema angegeben</span>}
                </h3>
                {(() => {
                  const s = STATUS_MAP[data.request.status] ?? { label: data.request.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                  return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${s.cls}`}>
                      {s.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-sm text-gray-500">
                {data.request.degreeType === "master" ? "Master" : "Bachelor"} &middot; {data.request.department}
                {(data.request as any).hasOwnTopic === 0 && (
                  <span className="ml-2 text-xs text-amber-600">(Kein eigenes Thema)</span>
                )}
              </p>
            </div>

            {/* Studierende:r */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Studierende:r</h4>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-900">{data.student.name ?? "–"}</p>
                <p className="text-sm text-gray-500">{data.student.email}</p>
              </div>
            </section>

            {/* Prüfer:innen */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prüfer:innen</h4>
              <div className="space-y-2">
                {data.firstExaminer ? (
                  <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                    <p className="text-xs text-primary font-semibold mb-0.5">Erstprüfer:in</p>
                    <p className="font-medium text-gray-900">{data.firstExaminer.name ?? "–"}</p>
                    <p className="text-sm text-gray-500">{data.firstExaminer.email}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-sm text-gray-400">
                    Noch keine Erstprüfer:in zugeteilt
                  </div>
                )}
                {data.secondExaminer ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-600 font-semibold mb-0.5">Zweitprüfer:in</p>
                    <p className="font-medium text-gray-900">{data.secondExaminer.name ?? "–"}</p>
                    <p className="text-sm text-gray-500">{data.secondExaminer.email}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-sm text-gray-400">
                    Noch keine Zweitprüfer:in zugeteilt
                  </div>
                )}
              </div>
            </section>

            {/* Kolloquium */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kolloquium</h4>
              {data.colloquium ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="font-medium text-gray-900">
                    {formatDate((data.colloquium as any).scheduledAt)}
                    {(data.colloquium as any).scheduledAt && (
                      <span className="text-gray-500 font-normal ml-2">
                        {new Date((data.colloquium as any).scheduledAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </span>
                    )}
                  </p>
                  {(data.colloquium as any).location && (
                    <p className="text-sm text-gray-500 mt-0.5">{(data.colloquium as any).location}</p>
                  )}
                  <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    (data.colloquium as any).status === "confirmed"
                      ? "bg-primary/5 text-primary border-primary/20"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}>
                    {(data.colloquium as any).status === "confirmed" ? "Bestätigt" : "Ausstehend"}
                  </span>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-sm text-gray-400">
                  Kein Kolloquiumstermin geplant
                </div>
              )}
            </section>

            {/* Statushistorie */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Statushistorie</h4>
              {data.history.length === 0 ? (
                <p className="text-sm text-gray-400">Keine Einträge vorhanden.</p>
              ) : (
                <div className="space-y-2">
                  {(data.history as any[]).map((entry, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-2 h-2 rounded-full bg-[#76B900] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {JSON.stringify(entry.metadata)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Metadaten */}
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Metadaten</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Eingereicht</p>
                  <p className="font-medium text-gray-900">{formatDate(data.request.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Abgabefrist</p>
                  <p className="font-medium text-gray-900">{formatDate(data.request.deadline)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Sprache</p>
                  <p className="font-medium text-gray-900">{data.request.language === "de" ? "Deutsch" : data.request.language === "en" ? "Englisch" : data.request.language ?? "–"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Antrags-ID</p>
                  <p className="font-medium text-gray-900">#{data.request.id}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main ---
export default function DeanDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const { data: requests, isLoading } = trpc.dean.getAllRequests.useQuery(undefined, {
    enabled: !!user,
  });
  const [csvFilters, setCsvFilters] = useState<{ status?: string; search?: string } | null>(null);
  const { refetch: fetchCsv, isFetching: csvLoading } = trpc.dean.exportCsv.useQuery(
    csvFilters ?? {},
    { enabled: false }
  );

  function handleCsvDownload() {
    // Aktuelle Filter mitgeben
    setCsvFilters({ status: filterStatus !== "all" ? filterStatus : undefined, search: search || undefined });
    // Kurz warten bis State gesetzt, dann abrufen
    setTimeout(() => {
      fetchCsv().then((result) => {
        if (!result.data?.csv) return;
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const suffix = (filterStatus && filterStatus !== "all") ? `_${filterStatus.toLowerCase()}` : "";
        a.download = `abschlussarbeiten${suffix}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }, 50);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#76B900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowedRoles = ["dean", "vice_dean", "admin", "superadmin"];
  if (!user || !allowedRoles.includes(user.role ?? "")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sie haben keinen Zugriff auf diesen Bereich.</p>
          <Link href="/" className="text-[#76B900] hover:underline text-sm">Zur Startseite</Link>
        </div>
      </div>
    );
  }

  const roleLabel = user.role === "dean" ? t.dean.dean : user.role === "vice_dean" ? t.dean.viceDean : "Admin";

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
    rejected: (requests ?? []).filter((r) => r.request.status === "REJECTED").length,
  };

  const statCards = [
    { label: t.dean.total, value: stats.total, cls: "text-gray-900" },
    { label: t.dean.pending, value: stats.pending, cls: "text-yellow-600" },
    { label: t.dean.matched, value: stats.matched, cls: "text-blue-600" },
    { label: t.dean.accepted, value: stats.accepted, cls: "text-primary" },
    { label: t.dean.rejected, value: stats.rejected, cls: "text-red-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Detailansicht-Seitenleiste */}
      {selectedRequestId !== null && (
        <RequestDetailSheet
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}

      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🏛️</span>
              <h1 className="text-2xl font-bold text-gray-900">{t.dean.title}</h1>
            </div>
            <p className="text-sm text-gray-500">
              Angemeldet als <span className="font-medium text-gray-700">{user.name ?? user.email}</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                {roleLabel}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCsvDownload}
              disabled={csvLoading || !requests?.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#76B900] text-white text-sm font-medium hover:bg-[var(--primary)] transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {csvLoading ? t.dean.exporting : t.dean.csvExport}
            </button>
            <Link
              href="/dean/stats"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#76B900] bg-white text-sm text-[#76B900] hover:bg-primary/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t.dean.statistics}
            </Link>
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              {t.nav.home}
            </Link>
          </div>
        </div>

        {/* Statistik-Kacheln */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {statCards.map((s) => (
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
              placeholder={t.dean.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="all">{t.dean.allStatus}</option>
            <option value="PENDING">{t.dean.pending}</option>
            <option value="ACCEPTED">{t.dean.accepted}</option>
            <option value="MATCHED">{t.dean.matched}</option>
            <option value="REJECTED">{t.dean.rejected}</option>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colTopic}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colStudent}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colDepartment}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colDegree}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colStatus}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.dean.colSubmitted}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(({ request, student }) => {
                    const s = STATUS_MAP[request.status] ?? { label: request.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-purple-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRequestId(request.id)}
                      >
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
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-50">
              {t.dean.clickForDetails}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
