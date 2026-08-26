import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const DEPARTMENT_LABELS: Record<string, { de: string; en: string }> = {
  FB1: { de: "Fachbereich 1", en: "Department 1" }, FB2: { de: "Fachbereich 2", en: "Department 2" }, FB3: { de: "Fachbereich 3", en: "Department 3" }, FB4: { de: "Fachbereich 4", en: "Department 4" }, FB5: { de: "Fachbereich 5", en: "Department 5" },
};

export default function ProgrammePage() {
  const [, params] = useRoute("/studiengaenge/:programmeId");
  const programmeId = Number(params?.programmeId);
  const { lang } = useLanguage();
  const isDE = lang === "de";
  const { data, isLoading } = trpc.programmes.publicPage.useQuery({ programmeId }, { enabled: Number.isInteger(programmeId) && programmeId > 0 });

  if (isLoading) return <main className="min-h-screen grid place-items-center text-slate-500">{isDE ? "Studiengang wird geladen …" : "Loading programme …"}</main>;
  if (!data) return <main className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-semibold">{isDE ? "Studiengang nicht gefunden" : "Programme not found"}</h1><Link href="/studiengaenge" className="mt-4 inline-block text-[#4f7d00] underline">{isDE ? "Zur Übersicht" : "Back to overview"}</Link></div></main>;
  const { programme, links, managers } = data;
  const speakers = managers.filter((manager) => manager.managerType === "speaker");

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-5xl px-5 py-5"><Link href="/studiengaenge" className="text-sm text-slate-600 hover:text-slate-900">← {isDE ? "Alle Studiengänge" : "All programmes"}</Link></div></header>
      <section className="border-b border-[#dcebc2] bg-white"><div className="mx-auto max-w-5xl px-5 py-12 flex flex-col sm:flex-row gap-7 sm:items-center">
        {programme.logoUrl || programme.pictogramUrl ? <img src={programme.logoUrl || programme.pictogramUrl || ""} alt="" className="h-28 w-28 object-contain" /> : <div className="h-28 w-28 bg-[#eef6de] text-[#4f7d00] grid place-items-center text-2xl font-bold">{programme.abbreviation.slice(0, 4)}</div>}
        <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5e9200]">{DEPARTMENT_LABELS[programme.fachbereich]?.[isDE ? "de" : "en"] ?? programme.fachbereich} · {programme.level === "master" ? "Master" : "Bachelor"}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{programme.name}</h1><p className="mt-2 text-slate-500">{programme.abbreviation}</p></div>
      </div></section>
      <div className="mx-auto max-w-5xl px-5 py-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="prose prose-slate max-w-none"><h2>{isDE ? "Informationen zum Studiengang" : "Programme information"}</h2>{programme.information ? <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{programme.information}</p> : <p className="text-slate-500">{isDE ? "Für diesen Studiengang wurden noch keine weiterführenden Informationen veröffentlicht." : "No additional programme information has been published yet."}</p>}
          {links.length > 0 && <><h2 className="mt-10">{isDE ? "Links, Empfehlungen und Tipps" : "Links, recommendations and tips"}</h2><div className="not-prose space-y-3">{links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 bg-white p-4 hover:border-[#76b900] hover:bg-[#fbfff1]"><p className="font-semibold text-slate-800">{link.title}</p>{link.description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{link.description}</p>}</a>)}</div></>}
        </article>
        <aside className="h-fit border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{isDE ? "Studiengangsleitung" : "Programme management"}</h2>{speakers.length > 0 ? <div className="mt-4 space-y-3">{speakers.map((speaker) => <div key={speaker.userId} className="border-t border-slate-100 pt-3"><p className="font-medium text-slate-800">{[speaker.title, speaker.name].filter(Boolean).join(" ")}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">{isDE ? "Noch nicht veröffentlicht." : "Not published yet."}</p>}</aside>
      </div>
    </main>
  );
}
