import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

// ─── Farben ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  MATCHED: "#3B82F6",
  ACCEPTED: "#10B981",
  REJECTED: "#EF4444",
  PENDING_FIRST_EXAMINER: "#F59E0B",
  FIRST_EXAMINER_ACCEPTED: "#10B981",
  FIRST_EXAMINER_REJECTED: "#EF4444",
  PENDING_SECOND_EXAMINER: "#8B5CF6",
  COMPLETED: "#06B6D4",
};

// ─── KPI-Kachel ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
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
export default function ReportingDashboard() {
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d;
  });
  
  const [endDate, setEndDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: statsByPeriod, isLoading: loadingPeriod } = trpc.reporting.getStatsByPeriod.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const { data: statsByFaculty, isLoading: loadingFaculty } = trpc.reporting.getStatsByFaculty.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const { data: statsByStatus, isLoading: loadingStatus } = trpc.reporting.getStatsByStatus.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const { data: avgProcessingTime, isLoading: loadingProcessing } = trpc.reporting.getAverageProcessingTime.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const { data: dropoutRate, isLoading: loadingDropout } = trpc.reporting.getDropoutRate.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const { data: examinerWorkload, isLoading: loadingWorkload } = trpc.reporting.getExaminerWorkload.useQuery(
    { startDate, endDate },
    { enabled: !!user }
  );

  const exportCSV = trpc.reporting.exportCSV.useQuery(
    { reportType: "requests", startDate, endDate },
    { enabled: false }
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#006937] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowedRoles = ["admin", "superadmin", "pav", "dean", "vice_dean"];
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

  const isLoading = loadingPeriod || loadingFaculty || loadingStatus || loadingProcessing || loadingDropout || loadingWorkload;

  // Statistiken berechnen
  const totalRequests = statsByPeriod?.length || 0;
  const acceptedRequests = statsByStatus?.find(s => s.status === "FIRST_EXAMINER_ACCEPTED")?.count || 0;
  const rejectedRequests = statsByStatus?.find(s => s.status === "FIRST_EXAMINER_REJECTED")?.count || 0;
  const successRate = totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0;

  // Daten für Diagramme
  const pieData = (statsByStatus || []).map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#9CA3AF",
  }));

  const barData = (statsByFaculty || [])
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((f) => ({
      name: f.department,
      total: f.total,
      accepted: f.byStatus["FIRST_EXAMINER_ACCEPTED"] || 0,
      rejected: f.byStatus["FIRST_EXAMINER_REJECTED"] || 0,
    }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reporting-Dashboard</h1>
          <p className="text-gray-600">Erweiterte Statistiken und Analysen</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Von</label>
              <input
                type="date"
                value={startDate.toISOString().split("T")[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Bis</label>
              <input
                type="date"
                value={endDate.toISOString().split("T")[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <Button
              onClick={() => exportCSV.refetch()}
              className="bg-[#76B900] hover:bg-[#006937] text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV exportieren
            </Button>
          </div>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard label="Gesamt-Anfragen" value={totalRequests} />
          <KpiCard label="Angenommen" value={acceptedRequests} color="text-green-600" />
          <KpiCard label="Abgelehnt" value={rejectedRequests} color="text-red-600" />
          <KpiCard label="Erfolgsquote" value={`${successRate}%`} color="text-blue-600" />
          <KpiCard label="Ø Bearbeitungszeit" value={`${avgProcessingTime || 0} Tage`} color="text-purple-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: "overview", label: "Überblick" },
            { id: "faculty", label: "Nach Fachbereich" },
            { id: "examiners", label: "Prüfer:innen-Auslastung" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#76B900] text-[#006937]"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#006937] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Überblick */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status-Diagramm */}
                <Card className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Anfragen nach Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Abbruchquote */}
                <Card className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Abbruchquote</h3>
                  <div className="flex items-center justify-center h-300">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${dropoutRate && dropoutRate > 20 ? "text-red-600" : "text-green-600"}`}>
                        {dropoutRate || 0}%
                      </div>
                      <p className="text-gray-600 mt-2">der Anfragen wurden abgelehnt</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Nach Fachbereich */}
            {activeTab === "faculty" && (
              <Card className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Anfragen nach Fachbereich</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#3B82F6" name="Gesamt" />
                    <Bar dataKey="accepted" fill="#10B981" name="Angenommen" />
                    <Bar dataKey="rejected" fill="#EF4444" name="Abgelehnt" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Prüfer:innen-Auslastung */}
            {activeTab === "examiners" && (
              <Card className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prüfer:innen-Auslastung</h3>
                <div className="space-y-4">
                  {(examinerWorkload || []).map((e, idx) => (
                    <LoadBar key={idx} name={e.name} current={e.current} max={e.max} />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
