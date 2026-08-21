import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, Download, MessageSquarePlus, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

const audienceLabels: Record<string, string> = {
  general: "Allgemein",
  student: "Studierende",
  firstExaminer: "Erstprüfer:innen",
  secondExaminer: "Zweitprüfer:innen",
  admin: "Verwaltung",
};

export function FaqFeedbackAdminPanel() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.faq.adminOverview.useQuery();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const publishAnswer = trpc.faq.answerAndPublish.useMutation({ onSuccess: () => utils.faq.adminOverview.invalidate() });
  const guideLabels: Record<string, string> = { first_examiner: "Erstprüfung", second_examiner: "Zweitprüfung", administration: "Verwaltung" };
  if (isLoading) return <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">FAQ-Rückmeldungen werden geladen …</div>;

  return (
    <section className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#679900]">FAQ-Weiterentwicklung</p><h2 className="mt-1 text-xl font-bold text-slate-900">Rückmeldungen aus der Praxis</h2></div>
        <span className="rounded-full bg-[#eff9df] px-3 py-1.5 text-sm font-bold text-[#527b00]">{data?.newCount ?? 0} offen</span>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-600">Die Übersicht zeigt ausschließlich anonym eingereichte Fragen und aggregierte Bewertungen. Es werden keine Namen, E-Mail-Adressen, Nutzerkennungen oder Fallinformationen erfasst.</p>
      <section className="rounded-2xl border border-[#d9edb4] bg-[#f8fdf1] p-5" aria-labelledby="guide-download-analytics-title">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#76B900] text-white"><BarChart3 className="h-5 w-5" /></div><div><h3 id="guide-download-analytics-title" className="font-bold text-slate-900">Anonyme Leitfaden-Downloads</h3><p className="mt-1 text-sm text-slate-600">Aggregierte Klickzahlen ohne Nutzer-, Geräte- oder IP-Bezug. Pro Browser-Sitzung wird ein Leitfaden höchstens einmal gezählt.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{["first_examiner", "second_examiner", "administration"].map((guideKey) => { const item = data?.guideDownloads.find((entry) => entry.guideKey === guideKey); return <div key={guideKey} className="rounded-xl bg-white p-4 ring-1 ring-[#dcecc1]"><p className="text-xs font-bold uppercase tracking-wide text-[#587d18]">{guideLabels[guideKey]}</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900"><Download className="h-5 w-5 text-[#76B900]" />{item?.downloadCount ?? 0}</p></div>; })}</div>
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><MessageSquarePlus className="h-5 w-5 text-[#679900]" />Eingereichte Fragen</div>
          <div className="mt-4 space-y-3">
            {data?.feedback.length ? data.feedback.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-[#527b00]">{audienceLabels[item.audience] ?? item.audience}</span><span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("de-DE")}</span></div><p className="mt-2 text-sm leading-relaxed text-slate-700">{item.message}</p>{item.status === "PUBLISHED" ? <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#527b00]"><CheckCircle2 className="h-4 w-4" />Als FAQ veröffentlicht</p> : <div className="mt-4 border-t border-slate-200 pt-4"><label className="text-xs font-bold text-slate-600">Antwort der Verwaltung</label><textarea value={answers[item.id] ?? item.answer ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1600} placeholder="Antwort formulieren …" className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#76B900]" /><div className="mt-2 flex flex-wrap gap-2"><button disabled={(answers[item.id] ?? item.answer ?? "").trim().length < 15 || publishAnswer.isPending} onClick={() => publishAnswer.mutate({ id: item.id, answer: answers[item.id] ?? item.answer ?? "", publish: false })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Antwort speichern</button><button disabled={(answers[item.id] ?? item.answer ?? "").trim().length < 15 || publishAnswer.isPending} onClick={() => publishAnswer.mutate({ id: item.id, answer: answers[item.id] ?? item.answer ?? "", publish: true })} className="inline-flex items-center gap-1 rounded-lg bg-[#76B900] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />Als FAQ veröffentlichen</button></div></div>}</div>) : <p className="py-8 text-center text-sm text-slate-500">Noch keine Rückmeldungen vorhanden.</p>}
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
