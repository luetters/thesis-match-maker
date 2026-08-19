import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function MyColloquiums() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isSecondExaminer = user?.role === "second_examiner";
  const { data: allColloquiums, isLoading } = trpc.colloquium.myExaminerColloquiums.useQuery();
  const colloquiums = isSecondExaminer ? (allColloquiums ?? []).filter((col: any) => col.thesisSecondExaminerId === user?.id) : allColloquiums;
  if (isLoading) return <div className="text-sm text-gray-500">Wird geladen...</div>;
  if (!colloquiums?.length) return <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center"><p className="text-sm font-medium text-gray-700">Keine Kolloquien geplant</p><p className="text-xs text-gray-500 mt-1">{isSecondExaminer ? "Sie sind bei keiner Abschlussarbeit als Zweitgutachter:in eingetragen." : "Sobald ein Termin angelegt wird, erscheint er hier."}</p></div>;
  const upcomingCount = colloquiums.filter((col: any) => col.status === "SCHEDULED").length;
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><p className="text-sm text-gray-500">{colloquiums.length} {colloquiums.length === 1 ? "Termin" : "Termine"}{upcomingCount > 0 && ` · ${upcomingCount} ausstehend`}</p><a href="/api/ics/colloquiums/all" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors" style={{ color: "#76B900", borderColor: "#76B900", backgroundColor: "#76B90010" }} title="Alle Kolloquien als Kalender-Datei herunterladen">Alle Termine exportieren (.ics)</a></div>
    {colloquiums.map((col: any) => <div key={col.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><h3 className="font-semibold text-gray-900">{col.title}</h3><p className="text-sm text-gray-500 mt-0.5">{new Date(col.scheduledAt).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" })}</p>{(col.location || col.room) && <p className="text-sm text-gray-600 mt-1">{[col.location, col.room].filter(Boolean).join(" – ")}</p>}{col.notes && <p className="text-xs text-gray-500 mt-2 italic">{col.notes}</p>}</div><span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${col.status === "SCHEDULED" ? "bg-blue-50 text-blue-700" : col.status === "COMPLETED" ? "bg-primary/5 text-primary" : "bg-red-50 text-red-700"}`}>{col.status === "SCHEDULED" ? (t.examiner.colStatusScheduled ?? "Geplant") : col.status === "COMPLETED" ? (t.examiner.colStatusCompleted ?? "Abgeschlossen") : (t.examiner.colStatusCancelled ?? "Abgesagt")}</span></div><div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between"><a href={`/api/ics/colloquium/${col.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: "#76B900" }} title="Diesen Termin als Kalender-Eintrag herunterladen">Termin exportieren (.ics)</a><span className="text-[10px] text-gray-400">{new Date(col.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span></div></div>)}
  </div>;
}
