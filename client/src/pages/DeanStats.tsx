import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

// ─── Farben ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  MATCHED: "#3B82F6",
  ACCEPTED: "#10B981",
  REJECTED: "#EF4444",
};
// STATUS_LABELS werden dynamisch in der Komponente erzeugt
const STATUS_LABELS_DE: Record<string, string> = {
  PENDING: "Ausstehend",
  MATCHED: "Zugeteilt",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
};
const DEPT_COLORS = [
  "#006937", "#76B900", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EF4444", "#10B981", "#EC4899", "#14B8A6", "#F97316",
];

// ─── KPI-Kachel ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Prüfer:innen-Auslastungsbalken ──────────────────────────────────────────
function LoadBar({ current, max, name }: { current: number; max: number; name: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F59E0B" : "#10B981";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 truncate shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-500 w-12 text-right shrink-0">{current}/{max}</span>
    </div>
  );
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────
export default function DeanStats() {
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  const STATUS_LABELS = lang === "en" ? { PENDING: "Pending", MATCHED: "Matched", ACCEPTED: "Accepted", REJECTED: "Rejected" } : STATUS_LABELS_DE;
  const { data: stats, isLoading } = trpc.dean.stats.useQuery(undefined, { enabled: !!user });

  if (loading || isLoading) {
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

  const pieData = (stats?.byStatus ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#9CA3AF",
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <h1 className="text-2xl font-bold text-gray-900">{t.dean.stats.title}</h1>
            </div>
            <p className="text-sm text-gray-500">{t.dean.stats.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dean"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.dean.stats.backToDashboard}
            </Link>
          </div>
        </div>

        {/* KPI-Kacheln */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard label="Anträge gesamt" value={stats?.kpis.total ?? 0} />
          <KpiCard label="Offen" value={stats?.kpis.open ?? 0} color="text-yellow-600" sub="Ausstehend + Zugeteilt" />
          <KpiCard label="Angenommen" value={stats?.kpis.accepted ?? 0} color="text-green-600" />
          <KpiCard label="Abschlussquote" value={`${stats?.kpis.completionRate ?? 0} %`} color="text-blue-600" sub="Angenommen / Gesamt" />
          <KpiCard label="Ø Bearbeitungszeit" value={`${stats?.kpis.avgDays ?? 0} Tage`} sub="Eingang bis Entscheidung" />
        </div>

        {/* Diagramme – Zeile 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status-Verteilung (Pie) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Status-Verteilung</h2>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten vorhanden</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} Anträge`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Anträge pro Monat (Line) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Anträge pro Monat (letzte 12 Monate)</h2>
            {(stats?.monthly ?? []).every((m) => m.count === 0) ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten vorhanden</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats?.monthly ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} Anträge`]} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#006937"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#006937" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Diagramme – Zeile 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Studiengang-Verteilung (Bar) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Top-Studiengänge nach Antragsvolumen</h2>
            {(stats?.byDepartment ?? []).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten vorhanden</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats?.byDepartment ?? []}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip formatter={(v: number) => [`${v} Anträge`]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(stats?.byDepartment ?? []).map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Prüfer:innen-Auslastung */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Prüfer:innen-Auslastung (Top 10)</h2>
            {(stats?.examinerLoad ?? []).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten vorhanden</div>
            ) : (
              <div className="space-y-3">
                {(stats?.examinerLoad ?? []).map((e, i) => (
                  <LoadBar key={i} name={e.name} current={e.current} max={e.max} />
                ))}
                <p className="text-xs text-gray-400 mt-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Kapazität frei
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mx-1 ml-3" />Auslastung ≥ 70 %
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mx-1 ml-3" />Auslastung ≥ 90 %
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
