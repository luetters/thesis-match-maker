import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

const DEPARTMENT_LABELS: Record<string, { de: string; en: string }> = {
  FB1: { de: "Fachbereich 1 – Ingenieurwissenschaften – Energie und Information", en: "Department 1 – Engineering – Energy and Information" },
  FB2: { de: "Fachbereich 2 – Ingenieurwissenschaften – Technik und Leben", en: "Department 2 – Engineering – Technology and Life" },
  FB3: { de: "Fachbereich 3 – Wirtschafts- und Rechtswissenschaften", en: "Department 3 – Business and Law" },
  FB4: { de: "Fachbereich 4 – Informatik, Kommunikation und Wirtschaft", en: "Department 4 – Computer Science, Communication and Business" },
  FB5: { de: "Fachbereich 5 – Gestaltung und Kultur", en: "Department 5 – Design and Culture" },
};

export default function ProgrammeDirectory() {
  const { lang } = useLanguage();
  const isDE = lang === "de";
  const { data: programmes, isLoading } = trpc.programmes.publicList.useQuery(undefined, { staleTime: 60_000 });
  const grouped = (programmes ?? []).reduce<Record<string, typeof programmes>>((groups, programme) => {
    const key = programme.fachbereich || "other";
    groups[key] ??= [];
    groups[key]?.push(programme);
    return groups;
  }, {});

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-[#28517a] hover:underline">HTW Berlin</Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">{isDE ? "Zur Startseite" : "Back to home"}</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-10">
        <p className="text-sm font-semibold tracking-[0.15em] uppercase text-[#5e9200]">{isDE ? "Studiengänge" : "Programmes"}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{isDE ? "Informationen zu den Studiengängen der HTW Berlin" : "Information on the programmes at HTW Berlin"}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{isDE ? "Finden Sie fachbereichsgeordnete Hinweise, veröffentlichte Informationen und weiterführende Empfehlungen der zuständigen Studiengangsleitungen und Verwaltung." : "Find department-based guidance, published programme information and selected recommendations from responsible programme management and administration."}</p>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16">
        {isLoading ? <p className="py-16 text-center text-slate-500">{isDE ? "Studiengänge werden geladen …" : "Loading programmes …"}</p> : Object.keys(grouped).length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">{isDE ? "Derzeit sind noch keine Studiengangsseiten veröffentlicht." : "No programme pages have been published yet."}</div>
        ) : (
          <div className="space-y-12">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([department, items]) => (
              <section key={department}>
                <div className="flex items-end justify-between border-b border-[#cfe59b] pb-3 gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#5e9200]">{department}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-800">{DEPARTMENT_LABELS[department]?.[isDE ? "de" : "en"] ?? department}</h2>
                  </div>
                  <span className="text-sm text-slate-500">{items?.length ?? 0} {isDE ? "Studiengänge" : "programmes"}</span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(items ?? []).map((programme) => (
                    <Link key={programme.id} href={`/studiengaenge/${programme.id}`} className="group min-h-48 border border-slate-200 bg-white p-5 transition-colors hover:border-[#76b900] hover:bg-[#fbfff1]">
                      <div className="flex items-start gap-4">
                        {programme.logoUrl || programme.pictogramUrl ? <img src={programme.logoUrl || programme.pictogramUrl || ""} alt="" className="h-14 w-14 shrink-0 object-contain" /> : <div className="h-14 w-14 shrink-0 bg-[#eef6de] text-[#5e9200] flex items-center justify-center text-sm font-bold">{programme.abbreviation.slice(0, 3)}</div>}
                        <div className="min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#5e9200]">{programme.level === "master" ? "Master" : "Bachelor"}</span>
                          <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-900 group-hover:text-[#4f7d00]">{programme.name}</h3>
                          <p className="mt-2 text-sm text-slate-500">{isDE ? "Informationen und Empfehlungen ansehen" : "View information and recommendations"}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
