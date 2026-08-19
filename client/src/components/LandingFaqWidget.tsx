import { ArrowRight, MessageCircleQuestion, ThumbsUp } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { FAQ_DE, FAQ_EN } from "@/pages/Faq";

type Audience = "general" | "student" | "firstExaminer" | "secondExaminer" | "admin";

export function LandingFaqWidget() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const { data: ratings } = trpc.faq.topRated.useQuery();
  const content = lang === "de" ? FAQ_DE : FAQ_EN;
  const questionsByKey = useMemo(() => Object.entries(content).flatMap(([audience, items]) => items.map((item, index) => ({ ...item, faqKey: `${audience}:${index}`, audience: audience as Audience }))), [content]);
  const ranked = (ratings ?? []).map((rating) => ({ ...rating, item: questionsByKey.find((item) => item.faqKey === rating.faqKey) })).filter((entry) => entry.item).slice(0, 3);
  const entries = ranked.length ? ranked.map((entry) => ({ item: entry.item!, metric: Number(entry.helpfulCount) + Number(entry.notHelpfulCount) })) : questionsByKey.filter((item) => item.audience === "general").slice(0, 3).map((item) => ({ item, metric: null }));
  const de = lang === "de";
  return (
    <section className="relative z-10 bg-[#f3fae8] py-18 sm:py-20">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5e8c00]">{ranked.length ? (de ? "Häufig bewertet" : "Frequently rated") : (de ? "Zum Einstieg empfohlen" : "Recommended to get started")}</p><h2 className="mt-2 text-3xl font-bold text-slate-900">{de ? "Fragen, die vielen weiterhelfen" : "Questions that help many people"}</h2></div><button onClick={() => navigate("/faq")} className="inline-flex items-center gap-2 text-sm font-bold text-[#547f00] hover:text-[#365400]">{de ? "Alle Fragen ansehen" : "View all questions"}<ArrowRight className="h-4 w-4" /></button></div>
        <div className="grid gap-4 lg:grid-cols-3">{entries.map(({ item, metric }) => <button key={item.faqKey} onClick={() => navigate(`/faq?role=${item.audience}`)} className="group rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-[#d9edbd] transition hover:-translate-y-0.5 hover:shadow-md"><MessageCircleQuestion className="h-5 w-5 text-[#76B900]" /><h3 className="mt-4 font-bold leading-snug text-slate-800 group-hover:text-[#547f00]">{item.question}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>{metric !== null && <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#5e8c00]"><ThumbsUp className="h-3.5 w-3.5" />{metric} {de ? "Bewertungen" : "ratings"}</span>}</button>)}</div>
      </div>
    </section>
  );
}
