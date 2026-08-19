import { trpc } from "@/lib/trpc";
import { BarChart3, MessageSquarePlus, ThumbsDown, ThumbsUp } from "lucide-react";

const audienceLabels: Record<string, string> = {
  general: "Allgemein",
  student: "Studierende",
  firstExaminer: "Erstprüfer:innen",
  secondExaminer: "Zweitprüfer:innen",
  admin: "Verwaltung",
};

export function FaqFeedbackAdminPanel() {
  const { data, isLoading } = trpc.faq.adminOverview.useQuery();
  if (isLoading) return <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">FAQ-Rückmeldungen werden geladen …</div>;

  return (
    <section className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#679900]">FAQ-Weiterentwicklung</p><h2 className="mt-1 text-xl font-bold text-slate-900">Rückmeldungen aus der Praxis</h2></div>
        <span className="rounded-full bg-[#eff9df] px-3 py-1.5 text-sm font-bold text-[#527b00]">{data?.newCount ?? 0} offen</span>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-600">Die Übersicht zeigt ausschließlich anonym eingereichte Fragen und aggregierte Bewertungen. Es werden keine Namen, E-Mail-Adressen, Nutzerkennungen oder Fallinformationen erfasst.</p>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><MessageSquarePlus className="h-5 w-5 text-[#679900]" />Eingereichte Fragen</div>
          <div className="mt-4 space-y-3">
            {data?.feedback.length ? data.feedback.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-[#527b00]">{audienceLabels[item.audience] ?? item.audience}</span><span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("de-DE")}</span></div><p className="mt-2 text-sm leading-relaxed text-slate-700">{item.message}</p></div>) : <p className="py-8 text-center text-sm text-slate-500">Noch keine Rückmeldungen vorhanden.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><BarChart3 className="h-5 w-5 text-[#679900]" />Antwortbewertungen</div>
          <div className="mt-4 space-y-3">
            {data?.ratings.length ? data.ratings.map((item) => <div key={item.faqKey} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span className="font-medium text-slate-600">{item.faqKey}</span><div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 text-[#527b00]"><ThumbsUp className="h-4 w-4" />{item.helpfulCount}</span><span className="inline-flex items-center gap-1 text-amber-700"><ThumbsDown className="h-4 w-4" />{item.notHelpfulCount}</span></div></div>) : <p className="py-8 text-center text-sm text-slate-500">Noch keine Bewertungen vorhanden.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
