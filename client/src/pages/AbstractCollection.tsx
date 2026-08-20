import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BookOpen, ChevronLeft, Filter, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const DEPARTMENTS = ["FB1", "FB2", "FB3", "FB4", "FB5"] as const;

/** Öffentliche Sammlung; sie erhält aus der API ausschließlich Semester, Titel, Fachbereich und Abstract. */
export default function AbstractCollection() {
  const [department, setDepartment] = useState<string>("ALL");
  const [semester, setSemester] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const filters = useMemo(() => ({ department: department === "ALL" ? undefined : department as typeof DEPARTMENTS[number], semester: semester === "ALL" ? undefined : semester, limit: 100 }), [department, semester]);
  const { data: entries, isLoading } = trpc.abstractCollection.publicList.useQuery(filters);
  const semesterOptions = useMemo(() => Array.from(new Set((entries ?? []).map((entry) => entry.submissionSemester))).sort().reverse(), [entries]);
  const visibleEntries = useMemo(() => (entries ?? []).filter((entry) => `${entry.title} ${entry.abstract} ${entry.department}`.toLocaleLowerCase("de-DE").includes(query.trim().toLocaleLowerCase("de-DE"))), [entries, query]);

  return <div className="min-h-screen bg-[#f7f9f4] text-gray-900">
    <header className="border-b border-[#dce7c5] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#456d00]"><ChevronLeft className="h-4 w-4" />Zur Startseite</Link><span className="text-sm font-medium text-gray-500">HTW Berlin · Abschlussarbeiten</span></div></header>
    <main className="mx-auto max-w-6xl px-5 py-12"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full bg-[#76B900]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#456d00]"><BookOpen className="h-3.5 w-3.5" />Fachliche Abstract-Sammlung</div><h1 className="mt-4 text-4xl font-bold tracking-tight text-[#183300]">Abschlussarbeiten im Überblick</h1><p className="mt-4 text-lg leading-8 text-gray-700">Freigegebene Abstracts aus der HTW Berlin. Die Sammlung zeigt ausschließlich Semester, Titel, Fachbereich und den redaktionell geprüften Abstract.</p></div>
      <section aria-label="Abstracts filtern" className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titel oder Inhalt durchsuchen" aria-label="Titel oder Inhalt durchsuchen" /></div><select className="rounded-md border border-input bg-background px-3 text-sm" value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Fachbereich filtern"><option value="ALL">Alle Fachbereiche</option>{DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select><select className="rounded-md border border-input bg-background px-3 text-sm" value={semester} onChange={(event) => setSemester(event.target.value)} aria-label="Semester filtern"><option value="ALL">Alle Semester</option>{semesterOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></section>
      <div className="mt-5 flex items-center gap-2 text-sm text-gray-600"><Filter className="h-4 w-4 text-[#5a8c00]" />{visibleEntries.length} {visibleEntries.length === 1 ? "freigegebener Abstract" : "freigegebene Abstracts"}</div>
      {isLoading ? <p className="py-16 text-center text-sm text-gray-500">Sammlung wird geladen …</p> : !visibleEntries.length ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><BookOpen className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-medium text-gray-800">Noch keine passenden Abstracts veröffentlicht.</p><p className="mt-1 text-sm text-gray-500">Passen Sie die Filter an oder schauen Sie später wieder vorbei.</p></div> : <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleEntries.map((entry, index) => <Card key={`${entry.title}-${entry.submissionSemester}-${index}`} className="border-slate-200 bg-white transition-transform duration-200 hover:-translate-y-0.5"><CardContent className="flex h-full flex-col p-6"><div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide"><span className="text-[#5a8c00]">{entry.department}</span><span className="text-slate-500">{entry.submissionSemester}</span></div><h2 className="mt-4 text-lg font-semibold leading-6 text-gray-900">{entry.title}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{entry.abstract}</p></CardContent></Card>)}</div>}
    </main>
  </div>;
}
